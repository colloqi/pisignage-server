var path = require('path'),
    config = require('../../config/config'),
    datastore = require('nedb'),
    Group = new datastore({filename: path.join(config.dbDir,'group.db'), autoload:true}),
    Asset = new datastore({filename: path.join(config.dbDir,'asset.db'), autoload:true}),
    Label = new datastore({filename: path.join(config.dbDir,'label.db'), autoload:true}),
    Player= new datastore({filename: path.join(config.dbDir,'player.db'),autoload:true}),
    Cast= new datastore({filename: path.join(config.dbDir,'cast.db'),autoload:true}),
    Settings = new datastore({filename: path.join(config.dbDir,'settings.db'), autoload:true});

Group.setDefaults = function(object) {
    object.playlists = object.playlists || [];
    object.assets = object.assets || [];
    object.orientation = object.orientation || 'landscape';
    object.animationEnable = object.animationEnable || false;
    object.signageBackgroundColor = object.signageBackgroundColor || '#000';
    object.urlReloadDisable = object.urlReloadDisable || false;
    object.resolution = object.resolution || '1080p';
    object.sleep = object.sleep || {enable:false};
    object.createdAt = object.createdAt || Date.now();
    object._id = object._id || Group.createNewId();
    object.watchFiles = object.watchFiles || false;
}

Asset.setDefaults = function(object) {
    object.labels = object.labels || [];
    object.createdAt = object.createdAt || Date.now();
    object._id = object._id || Asset.createNewId();
}

Label.setDefaults = function(object) {
    object.createdAt = object.createdAt || Date.now();
    object._id = object._id || Label.createNewId();
}

Player.setDefaults = function(object) {
    object.isConnected = object.isConnected || false;
    object.registered = object.registered || false;
    object.serverServiceDisabled = object.serverServiceDisabled || false;
    object.lastUpload = object.lastUpload || 0;
    //object.TZ = object.TZ || "NA";
    object.createdAt = object.createdAt || Date.now();
    object._id = object._id || Player.createNewId();
}

Cast.setDefaults = function(object) {
    object.enabled = object.enabled || true;
    object.createdAt = object.createdAt || Date.now();
    object._id = object._id || Cast.createNewId();
}

Settings.setDefaults = function(settings) {
    settings.installation = settings.installation || "local";
    settings.assetLogEnable = settings.assetLogEnable || false;
    settings.newLayoutsEnable = settings.newLayoutsEnable || false;
    settings.language = settings.language || "en";
    settings.defaultDuration=settings.defaultDuration||10;
    settings.authCredentials = settings.authCredentials || {user:"pi",password:"pi"};
    settings.createdAt = settings.createdAt || Date.now();
    settings._id = settings._id || Settings.createNewId();
}

Group.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
    if (err)
        console.log("index settings error for Group db: "+err)
})

Asset.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
    if (err)
        console.log("index settings error for Asset db: "+err)
})

Label.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
    if (err)
        console.log("index settings error for Label db: "+err)
})

Player.ensureIndex({ fieldName: 'cpuSerialNumber', unique: true }, function (err) {
    if (err)
        console.log("index settings error for Player db: "+err)
})
   
module.exports = {
    Group : Group,
    Asset : Asset,
    Label : Label,
    Player: Player,
    Cast: Cast,
    Settings: Settings,
    compactDbs: function() {
        Group.persistence.compactDatafile()
        Asset.persistence.compactDatafile()
        Label.persistence.compactDatafile()
        Player.persistence.compactDatafile()
        Cast.persistence.compactDatafile()
        Settings.persistence.compactDatafile()
    }
}