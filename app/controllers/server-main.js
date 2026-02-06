import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import * as rest from '../others/restware.js';
import config from '../../config/config.js';
import { emitMessage as emitMessageOld } from './server-socket.js';
import { emitMessage as emitMessageNew } from './server-socket-new.js';
import { emitMessage as emitMessageWS } from './server-socket-ws.js';
import { Player } from '../models/player.js';
import { Asset } from '../models/assets.js';

const playersToBeSynced = {};
const players = {};

export const getStatus = (req, res) => {
    return rest.sendSuccess(res, 'Dummy status', { server: true });
};

export const getSettings = () => {
};

export const saveSettings = () => {
};

// Helper function to copy file using streams
const copyFile = (srcfile, dstfile) => {
    return new Promise((resolve, reject) => {
        let cbCalled = false;
        const done = (err) => {
            if (!cbCalled) {
                cbCalled = true;
                if (err) reject(err);
                else resolve();
            }
        };

        const rd = fs.createReadStream(srcfile);
        rd.on('error', done);
        
        const wr = fs.createWriteStream(dstfile);
        wr.on('error', done);
        wr.on('close', () => done());
        
        rd.pipe(wr);
    });
};

// Helper function to process each asset file
const processAssetFile = async (file, mediaPath, syncPath, installation) => {
    if (!file) return { processed: true, missing: false };

    const srcfile = path.join(mediaPath, file);
    const dstfile = path.join(syncPath, file);

    try {
        // Remove old destination file (ignore errors)
        await fs.unlink(dstfile).catch(() => {});

        // Check if source file exists
        const stats = await fs.stat(srcfile).catch(() => null);
        
        if (!stats || !stats.isFile()) {
            // File doesn't exist
            if (file.indexOf("TV_OFF") === -1) {
                return { processed: true, missing: true };
            }
            return { processed: true, missing: false };
        }

        // Copy the file
        await copyFile(srcfile, dstfile);
        return { processed: true, missing: false };
        
    } catch (err) {
        const errMessage = `Unable to copy playlist ${file} for ${installation}`;
        console.error(errMessage, err);
        throw new Error(errMessage);
    }
};

// Helper function to process special files
const processSpecialFile = async (file, mediaPath, syncPath) => {
    const srcPath = path.join(mediaPath, file);
    const dstPath = path.join(syncPath, file);

    try {
        // Remove old symlink (ignore errors)
        await fs.unlink(dstPath).catch(() => {});

        // Check if source file exists
        const stats = await fs.stat(srcPath).catch(() => null);
        
        if (!stats || !stats.isFile()) {
            return { added: false };
        }

        // Create symlink
        await fs.symlink(srcPath, dstPath).catch((err) => {
            if (err.code !== 'ENOENT') {
                console.log(`Error in creating symlink to ${file}`);
            }
        });

        return { added: true };
    } catch (err) {
        return { added: false };
    }
};

// Step 1: Validate and get players
const validateAndGetPlayers = async (group) => {
    if (!group.playlists || group.playlists.length === 0) {
        throw new Error("No Playlists assigned to the Group");
    }

    const data = await Player.find({ 'group._id': group._id });
    
    if (!data || data.length === 0) {
        throw new Error("No Players associated");
    }

    // Store players in lookup objects
    data.forEach((player) => {
        playersToBeSynced[player.cpuSerialNumber] = player;
    });
    players[group._id.toString()] = data;

    return data;
};

// Step 2: Sync media files
const syncMediaFiles = async (installation, group) => {
    const syncPath = path.join(config.syncDir, installation, group.name);
    const mediaPath = path.join(config.mediaDir);

    // Create sync directory (recursive, ignore if exists)
    await fs.mkdir(syncPath, { recursive: true }).catch(() => {});

    const filesNotPresent = [];

    // Process each asset sequentially
    for (const file of group.assets) {
        const result = await processAssetFile(file, mediaPath, syncPath, installation);
        if (result.missing) {
            filesNotPresent.push(file);
        }
    }

    // Remove missing files from group.assets
    group.assets = group.assets.filter(file => !filesNotPresent.includes(file));
};

// Step 3: Clean old files
const cleanOldFiles = async (installation, group) => {
    const syncPath = path.join(config.syncDir, installation, group.name);

    try {
        const files = await fs.readdir(syncPath);
        
        // Filter out hidden files
        const visibleFiles = files.filter(file => file.charAt(0) !== '.');

        // Remove files not in group's asset list
        for (const file of visibleFiles) {
            if (!file) continue;
            
            if (group.assets.indexOf(file) === -1) {
                await fs.unlink(path.join(syncPath, file)).catch(() => {});
            }
        }
    } catch (err) {
        throw err;
    }
};

// Step 4: Add special files
const addSpecialFiles = async (installation, group) => {
    const specialFiles = ["brand_intro.mp4", "brand_intro_portrait.mp4", "welcome.ejs", "iot.zip"];
    const filesAdded = [];
    const syncPath = path.join(config.syncDir, installation, group.name);
    const mediaPath = path.join(config.mediaDir);

    for (const file of specialFiles) {
        const result = await processSpecialFile(
            file,
            mediaPath,
            syncPath
        );
        
        if (result.added) {
            filesAdded.push(file);
        }
    }

    // Add special files to group assets
    group.assets = group.assets.concat(filesAdded);
};

// Step 5: Get asset validity
const getAssetValidity = async (installation, group) => {
    try {
        const data = await Asset.find(
            {
                'validity.enable': true,
                'name': { $in: group.assets }
            },
            'name validity'
        ).lean();

        if (data && data.length > 0) {
            group.assetsValidity = data.map((asset) => ({
                name: asset.name,
                startdate: asset.validity.startdate,
                enddate: asset.validity.enddate,
                starthour: asset.validity.starthour,
                endhour: asset.validity.endhour
            }));
        } else {
            group.assetsValidity = [];
        }
    } catch (err) {
        group.assetsValidity = [];
        util.log(`Asset validity query error for ${installation}; ${err}`);
    }
};

// Step 6: Send sync to players
const sendSyncToPlayers = (group) => {
    const groupPlayers = players[group._id.toString()];
    
    groupPlayers.forEach((player) => {
        const emitMessage = player.webSocket 
            ? emitMessageWS 
            : (player.newSocketIo ? emitMessageNew : emitMessageOld);
            
        emitMessage(
            player.socket,
            'sync',
            group.playlists,
            group.assets,
            group.deployedTicker,
            group.logo,
            group.logox,
            group.logoy,
            group.combineDefaultPlaylist,
            group.omxVolume,
            group.loadPlaylistOnCompletion,
            group.assetsValidity
        );
    });
    
    console.log("sending sync event to players");
};

// Main deploy function - ES6 async/await version
export const deploy = async (installation, group, cb) => {
    try {
        // Step 1: Validate and get players
        await validateAndGetPlayers(group);

        // Step 2: Sync media files
        await syncMediaFiles(installation, group);

        // Step 3: Clean old files
        await cleanOldFiles(installation, group);

        // Step 4: Add special files
        await addSpecialFiles(installation, group);

        // Step 5: Get asset validity
        await getAssetValidity(installation, group);

        // Set deployed state
        group.deployedAssets = group.assets;
        group.deployedPlaylists = group.playlists;
        group.deployedTicker = group.ticker;

        // Step 6: Send sync to players
        sendSyncToPlayers(group);

        // Success callback
        cb(null, group);
        
    } catch (err) {
        console.log("Error in deploy: ", err);
        cb(err, group);
    }
};
