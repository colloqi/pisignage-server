

import mongoose from 'mongoose';
import { Group } from '../models/group.js';
import fs from 'fs';
import config from '../../config/config.js';
import * as rest from '../others/restware.js';
import path from 'path';
import * as serverMain from './server-main.js';
import * as licenses from './licenses.js';

let installation;

const initializeInstallation = async () => {
    try {
        const settings = await licenses.getSettingsModel();
        installation = settings.installation || "local";
    } catch (err) {
        console.error('Error loading settings:', err);
        installation = "local"; // fallback
    }
};


export const newGroup = async (group) => {
      // Initialize installation when function is called
      await initializeInstallation();
    try {
        // Find existing group by name
        let object = await Group.findOne({ name: group.name });
        
        if (!object) {
            // No existing group found, create new one
            object = new Group(group);
        } else {
            // Existing group found, merge new data into it
            Object.assign(object, group);
        }
        
        // Validate group name exists
        if (!object.name) {
            console.log("can not be null: " + object.name);
            throw new Error('Unable to create a group folder in server: ' + object.name);
        }
        
        // Create sync folder for the group
        const folderPath = path.join(config.syncDir, installation, object.name);
        
        try {
            await fs.promises.mkdir(folderPath, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw new Error('Unable to create a group folder in server: ' + err);
            }
            // If folder exists (EEXIST), continue
        }
        
        // Save the group to database
        const data = await object.save();
        return data;
        
    } catch (err) {
        throw err;
    }
};

export const loadObject = async (req, res, next, id) => {
    try {
        const object = await Group.load(id);
        if (!object) {
            return rest.sendError(res, 'Unable to get group details', new Error('Group not found'));
        }
        req.object = object;
        next();
    } catch (err) {
        return rest.sendError(res, 'Unable to get group details', err);
    }
};

export const index = async (req, res) => {
    try {
        const criteria = {};
        
        if (req.query['string']) {
            criteria['name'] = new RegExp(req.query['string'], "i");
        }
        
        if (req.query['all']) {
            criteria['all'] = true;
        }
        
        const page = req.query['page'] > 0 ? req.query['page'] : 0;
        const perPage = req.query['per_page'] || 500;
        
        const options = {
            perPage: perPage,
            page: page,
            criteria: criteria
        };
        
        const groups = await Group.list(options);
        return rest.sendSuccess(res, 'Sending Group list', groups);
    } catch (err) {
        return rest.sendError(res, 'Unable to get Group list', err);
    }
};


export const getObject = (req, res) => {
    const object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Group details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Group details');
    }
};


    


export const createObject = async (req, res) => {
    const object = req.body;
    try {
        const data = await newGroup(object);
        return rest.sendSuccess(res, 'new Group added successfully', data);
    } catch (err) {
        return rest.sendError(res, 'Error creating Group', err);
    }
};


export const updateObject = async (req, res) => {
    try {
        const object = req.object;
        delete req.body.__v; // do not copy version key
        
        // Create new folder if name is changing
        if (req.body.name && (object.name !== req.body.name)) {
            const newFolderPath = path.join(config.syncDir, installation, req.body.name);
            try {
                await fs.promises.mkdir(newFolderPath, { recursive: true });
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    console.log('Unable to create a group folder in server: ' + err);
                }
            }
        }
        
        // Merge request body into object (replaces _.extend)
        Object.assign(object, req.body);
        
        // If deploying, update deployed fields
        if (req.body.deploy) {
            object.deployedPlaylists = object.playlists;
            object.deployedAssets = object.assets;
            object.deployedTicker = object.ticker;
        }
        
        // Save the object
        await object.save();
        
        // If deploying, update lastDeployed and call deploy
        if (req.body.deploy) {
            object.lastDeployed = Date.now();
            
            // Update specific fields in database
            await Group.updateOne(
                { _id: object._id },
                {
                    $set: {
                        lastDeployed: object.lastDeployed,
                        assets: object.assets,
                        deployedAssets: object.deployedAssets,
                        assetsValidity: object.assetsValidity
                    }
                }
            );
            
            // Deploy to players (assuming this returns a promise or is async)
            await serverMain.deploy(installation, object);
        }
        
        return rest.sendSuccess(res, 'updated Group details', object);
        
    } catch (err) {
        return rest.sendError(res, 'Unable to update Group', err);
    }
};


export const deleteObject = async (req, res) => {
    if (!req.object || req.object.name == "default")
        return rest.sendError(res,'No group specified or can not remove default group');
    const object = req.object;
    try {
        await object.deleteOne();
        return rest.sendSuccess(res, 'Group record deleted successfully');
    } catch (err) {
        return rest.sendError(res, 'Unable to remove Group record', err);
    }
};