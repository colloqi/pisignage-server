import path from 'path';
import fs from 'fs/promises';
import config from '../../config/config.js';
import { sendSuccess, sendError } from '../others/restware.js';

const systemPlaylists = [
    {
        name: 'TV_OFF',
        settings: {},
        assets: [],
        layout: '1',
        schedule: {}
    }
];

const minPlaylistTemplate = {
    settings: {},
    assets: [],
    layout: '1',
    schedule: {},
    videoWindow: null,
    zoneVideoWindow: {},
    templateName: 'custom_layout.html'
};

const newPlaylistTemplate = {
    settings: {
        ticker: {
            enable: false,
            behavior: 'scroll',
            textSpeed: 3,
            rss: { enable: false, link: null, feedDelay: 10 }
        },
        ads: { adPlaylist: false, adCount: 1, adInterval: 60 },
        audio: { enable: false, random: false, volume: 50 }
    },
    assets: [],
    layout: '1',
    templateName: 'custom_layout.html',
    schedule: {},
    version: 0
};

// Helper: Check if filename is a playlist
const isPlaylist = (file) => {
    return file.startsWith('__') && file.endsWith('.json');
};

// Helper: Get playlist name from filename
const getPlaylistName = (filename) => {
    return path.basename(filename, '.json').slice(2);
};

// Helper: Get playlist filename from name
const getPlaylistFile = (name) => {
    return `__${name}.json`;
};

// Helper: Read and parse playlist file
const readPlaylistFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        if (!data) {
            return {};
        }
        return JSON.parse(data);
    } catch (error) {
        console.error(`Playlist file read error for ${filePath}:`, error);
        return {};
    }
};

// Helper: Write playlist file
const writePlaylistFile = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 4), 'utf8');
};

// Create new playlist
export const newPlaylist = async (playlist) => {
    const file = path.join(config.mediaDir, getPlaylistFile(playlist));
    const data = {
        ...newPlaylistTemplate,
        name: playlist
    };

    try {
        await writePlaylistFile(file, data);
        return data;
    } catch (err) {
        console.error(`Error creating playlist ${playlist}:`, err);
        throw err;
    }
};

// List all playlists (GET /api/playlists)
export const index = async (req, res) => {
    try {
        const assetDir = path.join(config.mediaDir);
        const files = await fs.readdir(assetDir);
        
        // Filter playlist files and sort
        const playlists = files
            .filter(isPlaylist)
            .sort((str1, str2) => 
                str1.localeCompare(str2, undefined, { numeric: true })
            );

        const list = [];

        // Process each playlist file -- verify order of name of playlist
        for (const plFile of playlists) {
            const playlist = {
                ...minPlaylistTemplate,
                name: getPlaylistName(plFile)
            };

            const filePath = path.join(assetDir, plFile);
            const obj = await readPlaylistFile(filePath);

            // Merge parsed data with defaults
            playlist.settings = obj.settings || {};
            playlist.assets = obj.assets || [];
            playlist.layout = obj.layout || '1';
            playlist.templateName = obj.templateName || 'custom_layout.html';
            playlist.videoWindow = obj.videoWindow || null;
            playlist.zoneVideoWindow = obj.zoneVideoWindow || {};
            playlist.schedule = obj.schedule || {};

            list.push(playlist);
        }

        // Add system playlists
        list.push(...systemPlaylists);

        return sendSuccess(res, 'Sending playlist list', list);
    } catch (err) {
        return sendError(res, 'Directory read error', err);
    }
};

// Get single playlist (GET /api/playlists/:file)
export const getPlaylist = async (req, res) => {
    if (!req.params.file) {
        return sendError(res, 'Missing playlist name in request');
    }

    if (req.params.file === 'TV_OFF') {
        return sendError(res, 'System Playlist, cannot be edited');
    }

    try {
        const file = path.join(config.mediaDir, getPlaylistFile(req.params.file));
        const obj = await readPlaylistFile(file);

        const playlist = {
            ...minPlaylistTemplate,
            name: req.params.file,
            settings: obj.settings || {},
            assets: obj.assets || [],
            layout: obj.layout || '1',
            templateName: obj.templateName || 'custom_layout.html',
            videoWindow: obj.videoWindow || null,
            zoneVideoWindow: obj.zoneVideoWindow || {},
            schedule: obj.schedule || {}
        };

        return sendSuccess(res, 'Sending playlist content', playlist);
    } catch (err) {
        return sendError(res, 'Playlist file read error', err);
    }
};

// Create new playlist (POST /api/playlists)
export const createPlaylist = async (req, res) => {
    if (!req.body.file) {
        return sendError(res, 'Missing playlist name in request');
    }

    const playlistName = req.body.file.replace(config.filenameRegex, '');

    try {
        const data = await newPlaylist(playlistName);
        return sendSuccess(res, 'Playlist Created', data);
    } catch (err) {
        return sendError(res, 'Playlist write error', err);
    }
};

// Save/Update playlist (POST /api/playlists/:file)
export const savePlaylist = async (req, res) => {
    if (!req.params.file) {
        return sendError(res, 'Missing playlist name in request');
    }

    const playlistName = req.params.file;
    const file = path.join(config.mediaDir, getPlaylistFile(playlistName));

    try {
        // Read existing playlist or use TV_OFF default
        let fileData = await readPlaylistFile(file);
        
        // Handle TV_OFF special case
        if (Object.keys(fileData).length === 0 && playlistName === 'TV_OFF') {
            fileData = { ...systemPlaylists[0] };
        }

        // Initialize defaults
        fileData.version = fileData.version || 0;
        fileData.layout = fileData.layout || '1';

        let dirty = false;

        // Update fields if provided in request body
        const updates = {
            name: 'name',
            settings: 'settings',
            assets: 'assets',
            schedule: 'schedule',
            layout: 'layout'
        };

        Object.entries(updates).forEach(([key]) => {
            if (req.body[key]) {
                fileData[key] = req.body[key];
                
                // Handle layout-related fields
                if (key === 'layout') {
                    fileData.templateName = req.body.templateName || fileData.templateName;
                    fileData.videoWindow = req.body.videoWindow || null;
                    fileData.zoneVideoWindow = req.body.zoneVideoWindow || null;
                }
                
                dirty = true;
            }
        });

        // Save if changes were made
        if (dirty) {
            fileData.version += 1;
            await writePlaylistFile(file, fileData);
            return sendSuccess(res, 'Playlist Saved', fileData);
        } else {
            return sendSuccess(res, 'Nothing to Update', fileData);
        }
    } catch (err) {
        return sendError(res, 'Playlist save error', err);
    }
};