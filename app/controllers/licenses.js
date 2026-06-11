import fs from 'fs/promises';
import path from 'path';
import { fork , exec } from 'child_process';
import mongoose from 'mongoose';
import { promisify } from 'util';
const execAsync = promisify(exec);
import config from '../../config/config.js';
import * as rest from '../others/restware.js';
import ip from 'ip';
import { Settings } from '../models/settings.js';

const serverIp = ip.address();

let settingsModel = null;

let licenseDir = config.licenseDirPath;


const getTxtFiles = async () => {
    try {
        const files = await fs.readdir(licenseDir);
        const txtOnly = files.filter(file => /\.txt$/i.test(file));
        return txtOnly;
    } catch (err) {
        throw err;
    }
};

export const index = async (req, res) => {
    try {
        const files = await getTxtFiles();
        return rest.sendSuccess(res, 'total license list', files);
    } catch (err) {
        return rest.sendError(res, 'error in reading license directory', err);
    }
};


export const saveLicense = async (req, res) => {
    try {
        const uploadedFiles = req.files["assets"];
        const savedFiles = [];
        
        // Process each file sequentially
        for (const file of uploadedFiles) {
            try {
                await fs.rename(file.path, path.join(licenseDir, file.originalname));
                savedFiles.push({ name: file.originalname, size: file.size });
            } catch (err) {
                return rest.sendError(res, 'Error in saving license', err);
            }
        }
        
        return rest.sendSuccess(res, 'License saved successfully', savedFiles);
        
    } catch (err) {
        return rest.sendError(res, 'Error processing license files', err);
    }
};

export const deleteLicense = async (req, res) => {
    try {
        const filename = req.params['filename'];
        const filePath = path.join(licenseDir, filename);
        await fs.unlink(filePath);
        const files = await getTxtFiles();
        return rest.sendSuccess(res, 'License deleted successfully', files);
    } catch (err) {
        const filename = req.params['filename'] || 'unknown';
        return rest.sendError(res, `Error deleting license "${filename}"`, err);
    }
}

export const getSettingsModel = async () => {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            // No settings document exists, check cache
            if (settingsModel) {
                return settingsModel;
            } else {
                // Create new Settings document with defaults
                settingsModel = new Settings();
                await settingsModel.save();
                return settingsModel;
            }
        }
        return settings;
    } catch (err) {
        // On database error, return cached version if available
        if (settingsModel) {
            console.warn('Database error, returning cached settings:', err);
            return settingsModel;
        }
        throw err;
    }
};


export const getSettings = async (req, res) => {
    try {
        // Get settings from database
        const data = await getSettingsModel();
        const obj = data.toObject();
        obj.serverIp = serverIp;
        
        // Try to get Git version info
        try {
            const { stdout } = await execAsync('git log -1 --format="%cd" && git log -1 --format="%H"');
            const lines = stdout.trim().split('\n');
            
            // Parse date: "Mon Jan 15 10:30:45 2024 +0000" -> "Jan 15 2024"
            const dateParts = lines[0].split(' ');
            obj.date = [dateParts[1], dateParts[2], dateParts[4]].join(' ');
            
            // Get first 6 characters of commit hash
            obj.version = lines[1].slice(0, 6);
        } catch (gitErr) {
            // Git command failed, use defaults
            obj.date = 'N/A';
            obj.version = 'N/A';
            console.log('There was an error obtaining the current server version from git:', gitErr.message);
        }
        
        return rest.sendSuccess(res, 'Settings', obj);
    } catch (err) {
        return rest.sendError(res, 'Unable to access Settings', err);
    }
};

//Need to verify this function, restart logic is not clear
export const updateSettings = async (req, res) => {
    try {
        // Validate request body
        if (!req.body || Object.keys(req.body).length === 0) {
            return rest.sendError(res, 'No settings provided to update');
        }
        
        // Find existing settings
        let settings = await Settings.findOne();
        
        // Track if installation changed (determines if restart needed)
        const installationChanged = settings && 
                                   req.body.installation &&
                                   settings.installation !== req.body.installation;
        
        if (settings) {
            // Update existing settings
            Object.assign(settings, req.body);
        } else {
            // Create new settings document
            settings = new Settings(req.body);
        }
        
        // Save to database
        const data = await settings.save();
        
        // Update cache
        settingsModel = data;

        // Refresh the players controller's cached settings too, so changed
        // values (sshPassword, behaviors, authCredentials…) propagate to players
        // on their next config push rather than only after a server restart.
        // Dynamic import avoids a static players<->licenses circular import.
        try {
            const players = await import('./players.js');
            players.setSettings(data);
        } catch (e) {
            console.log('Unable to refresh players settings cache:', e);
        }

        // Update licenseDir if installation changed
        if (installationChanged) {
            licenseDir = config.licenseDirPath + (data.installation || 'local');
        }
        
        // Send success response
        rest.sendSuccess(res, 'Settings Saved', data);
        
        // Restart server if installation changed
        if (installationChanged) {
            console.log('Installation changed, restarting server...');
            // Give time for response to be sent
            setTimeout(() => {
                fork(process.argv[1]);
                process.exit(0);
            }, 500);
        }
    } catch (err) {
        return rest.sendError(res, 'Unable to update Settings', err);
    }
};




//Initialize licenseDir verify this function

(async () => {
    try {
        const settings = await getSettingsModel();
        licenseDir = config.licenseDirPath + (settings.installation || "local");
    } catch (err) {
        console.error('Error initializing licenseDir, using default:', err);
        licenseDir = config.licenseDirPath + "local";
    }
})();

