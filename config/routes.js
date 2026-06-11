import express from 'express';
import multer from 'multer';
import config from './config.js';

const router = express.Router();

// Import controllers
import * as assets from '../app/controllers/assets.js';
import * as playlists from '../app/controllers/playlists.js';
import * as players from '../app/controllers/players.js';
import * as groups from '../app/controllers/groups.js';
import * as labels from '../app/controllers/labels.js';
import * as rssFeed from '../app/controllers/rss-feed.js';
import * as licenses from '../app/controllers/licenses.js';

// Configure multer upload
const upload = multer({ dest: config.uploadDir });

/**
 * Application routes
 */
export default () => {
    // Asset routes
    router.get('/api/files', assets.index);
    router.get('/api/files/:file', assets.getFileDetails);
    router.post('/api/files', upload.fields([{ name: 'assets', maxCount: 10 }, { name: 'newfiles', maxCount: 10 }]), assets.createFiles);
    router.post('/api/postupload', assets.updateFileDetails);
    router.post('/api/playlistfiles', assets.updatePlaylist);
    router.post('/api/files/:file', assets.updateAsset);
    router.delete('/api/files/:file', assets.deleteFile);

    // Calendar routes (commented out)
    // router.get('/api/calendars/:file', assets.getCalendar);
    // router.post('/api/calendars/:file', assets.updateCalendar);
    //router.delete('/api/calendars/:file', assets.deleteFile);

    // Link routes
    router.post('/api/links', assets.createLinkFile);
    router.get('/api/links/:file', assets.getLinkFileDetails);

    // Playlist routes
    router.get('/api/playlists', playlists.index);
    router.get('/api/playlists/:file', playlists.getPlaylist);
    router.post('/api/playlists', playlists.createPlaylist);
    router.post('/api/playlists/:file', playlists.savePlaylist);
    router.put('/api/playlists/:file', playlists.savePlaylist);   // REST alias for /v2 UI

    // Group routes
    router.param('groupid', groups.loadObject);
    
    router.get('/api/groups', groups.index);
    router.get('/api/groups/:groupid', groups.getObject);
    router.post('/api/groups', groups.createObject);
    router.post('/api/groups/:groupid', groups.updateObject);
    router.put('/api/groups/:groupid', groups.updateObject);   // REST alias for /v2 UI
    router.delete('/api/groups/:groupid', groups.deleteObject);

    // Player routes
    router.param('playerid', players.loadObject);

    router.get('/api/players', players.index);
    router.get('/api/players/:playerid', players.getObject);
    router.post('/api/players', players.createObject);
    router.post('/api/players/:playerid', players.updateObject);
    router.delete('/api/players/:playerid', players.deleteObject);

    // Player command routes
    router.post('/api/pishell/:playerid', players.shell);
    router.post('/api/snapshot/:playerid', players.takeSnapshot);
    router.post('/api/swupdate/:playerid', players.swupdate);
    router.post('/api/pitv/:playerid', players.tvPower);
    router.post('/api/playlistmedia/:playerid/:action', players.playlistMedia);
    router.post('/api/setplaylist/:playerid/:playlist', players.setPlaylist);

    // Label routes
    router.param('label', labels.loadObject);

    router.get('/api/labels', labels.index);
    router.get('/api/labels/:label', labels.getObject);
    router.post('/api/labels', labels.createObject);
    router.post('/api/labels/:label', labels.updateObject);
    router.delete('/api/labels/:label', labels.deleteObject);

    // RSS Feed route
    router.get('/api/rssfeed', rssFeed.getFeeds);

    // License routes (with dynamic multer setup)
    licenses.getSettingsModel()
        .then((settings) => {
            const uploadLicense = multer({ 
                dest: config.licenseDirPath + (settings.installation || 'local') 
            });
            router.post(
                '/api/licensefiles',
                uploadLicense.fields([{ name: 'assets', maxCount: 10 }]),
                licenses.saveLicense
            );
        })
        .catch((err) => {
            console.error('Error setting up license upload route:', err);
        });

    router.get('/api/licensefiles', licenses.index);
    router.delete('/api/licensefiles/:filename', licenses.deleteLicense);

    // Settings routes
    router.get('/api/settings', licenses.getSettings);
    router.post('/api/settings', licenses.updateSettings);
    router.get('/api/serverconfig', licenses.getSettings);

    return router;
};

