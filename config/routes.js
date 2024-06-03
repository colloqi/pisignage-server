'use strict';

var express = require('express'),
    router = express.Router();

var multer = require('multer'),
    config = require('./config'),
    upload = multer({dest:config.uploadDir})

var assets = require('../app/controllers/assets'),
    playlists = require('../app/controllers/playlists'),
    players = require('../app/controllers/players'),
    groups = require('../app/controllers/groups'),
    labels = require('../app/controllers/labels'),
    rssFeed = require('../app/controllers/rss-feed'),
    licenses  = require('../app/controllers/licenses');
    //gcalAuthorize = require('../app/controllers/gcal-authorize');

/**
 * Application routes
 */

//Server Routes
// if(config.gCalendar.CLIENT_ID && config.gCalendar.CLIENT_SECRET){
//     router.get('/auth/gcal/callback', gcalAuthorize.gCalCallback)     // from Google
//     router.post('/api/gcal/authorize', gcalAuthorize.gCalAuthorize)   //from client
//}

router.get('/api/files', assets.assetsIndex);
router.get('/api/files/:file', assets.assetsGetFileDetails);
router.post('/api/files', upload.fields([{name:'assets',maxCount: 10}]), assets.assetsCreateFiles);
router.post('/api/postupload', assets.assetsUpdateFileDetails);
router.post('/api/playlistfiles', assets.assetsUpdatePlaylist);
router.post('/api/files/:file', assets.assetsUpdateAsset);
router.delete('/api/files/:file', assets.assetsDeleteFile);

// router.get('/api/calendars/:file', assets.getCalendar);
// router.post('/api/calendars/:file', assets.updateCalendar);
router.delete('/api/calendars/:file', assets.assetsDeleteFile);

router.post('/api/links', assets.assetsCreateLinkFile);
router.get('/api/links/:file', assets.assetsGetLinkFileDetails);

router.get('/api/playlists', playlists.index);
router.get('/api/playlists/:file', playlists.getPlaylist);
router.post('/api/playlists', playlists.createPlaylist);
router.post('/api/playlists/:file', playlists.savePlaylist);

// group routes
router.get('/api/groups', groups.index)
router.get('/api/groups/:groupid', groups.getObject)
router.post('/api/groups', groups.createObject)
router.post('/api/groups/:groupid', groups.updateObject)
router.delete('/api/groups/:groupid', groups.deleteObject)

router.param('groupid', groups.loadObject)

router.get('/api/players', players.index);
router.get('/api/players/:playerid', players.getObject)
router.post('/api/players', players.createObject)
router.post('/api/players/:playerid', players.updateObject)
router.delete('/api/players/:playerid', players.deleteObject)

router.post('/api/pishell/:playerid', players.shell)
router.post('/api/snapshot/:playerid',players.takeSnapshot)
router.post('/api/swupdate/:playerid', players.swupdate)
router.post('/api/pitv/:playerid',players.tvPower);

router.post('/api/playlistmedia/:playerid/:action',  players.playlistMedia);
router.post('/api/setplaylist/:playerid/:playlist',  players.setPlaylist);

router.param('playerid', players.loadObject)

router.get('/api/labels', labels.index);
router.get('/api/labels/:label', labels.getObject)
router.post('/api/labels', labels.createObject);
router.post('/api/labels/:label', labels.updateObject);
router.delete('/api/labels/:label', labels.deleteObject);
router.get('/api/rssfeed', rssFeed.getFeeds);

require('../app/controllers/licenses').getSettingsModel(function(err,settings){
    var uploadLicense = multer({dest:(config.licenseDirPath+(settings.installation || "local"))})
    router.post('/api/licensefiles',uploadLicense.fields([{name:'assets',maxCount: 10}]),licenses.saveLicense);
})
router.get('/api/licensefiles',licenses.index);
router.delete('/api/licensefiles/:filename',licenses.deleteLicense)

router.get('/api/settings',licenses.getSettings)
router.post('/api/settings',licenses.updateSettings)

router.get('/api/serverconfig',licenses.getSettings);

router.param('label', labels.loadObject)

module.exports = router;

