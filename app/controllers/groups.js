'use strict;'

var mongoose = require('mongoose'),
    Group = mongoose.model('Group'),
    Settings=mongoose.model('Settings'),
    Player = mongoose.model('Player'),

    fs = require('fs'),
    config = require('../../config/config'),
    exec = require('child_process').exec,
    sendConfig=require('./players'),
    rest = require('../others/restware'),
    _ = require('lodash'),

    path = require('path'),
    async = require('async');

var serverMain = require('./server-main'),
    licenses = require('./licenses');

var installation;

licenses.getSettingsModel(function(err,settings){
    installation = settings.installation || "local"
})



exports.newGroup = function (group, cb) {

    var object;
    Group.findOne({name:group.name}, function(err,data) {
        if (err || !data) {
            object = new Group(group);
        } else {
            object = _.extend(data, group);
        }
        //create a sync folder under sync_folder
        if (!object.name) {
            console.log("can not be null: "+object.name);
            return cb('Unable to create a group folder in server: '+object.name);
        }
        fs.mkdir(path.join(config.syncDir,installation, object.name),function(err){
            if (err && (err.code != 'EEXIST'))
                return cb('Unable to create a group folder in server: '+err);
            else {
                object.save(function (err, data) {
                    cb(err,data);
                })
            }
        });
    })
}

//Load a object
exports.loadObject = function (req, res, next, id) {

    Group.load(id, function (err, object) {
        if (err || !object)
            return rest.sendError(res,'Unable to get group details',err);

        req.object = object;
        next();
    })
}

//list of objects
exports.index = function (req, res) {

    var criteria = {};

    if (req.query['string']) {
        var str = new RegExp(req.query['string'], "i")
        criteria['name'] = str;
    }

    if (req.query['all']) {
        criteria['all'] = true;
    }

    var page = req.query['page'] > 0 ? req.query['page'] : 0
    var perPage = req.query['per_page'] || 500

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Group.list(options, function (err, groups) {
        if (err)
            return rest.sendError(res, 'Unable to get Group list', err);
        else
            return rest.sendSuccess(res, 'sending Group list', groups || []);
    })
}

exports.getObject = function (req, res) {

    var object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Group details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Group details', err);
    }

};

exports.createObject = function (req, res) {

    var object = req.body;

    exports.newGroup(object, function (err, data) {
        if (err)
            return rest.sendError(res, err);
        else
            return rest.sendSuccess(res, 'new Group added successfully', data);
    })
}
var exportAssets = {
    inProgress: false,
    link: '',
    file: '',
    statusMessage: ''
}

exports.getExportStatus = function(req, res) {
    rest.sendSuccess(res, exportAssets.statusMessage, exportAssets);
};
exports.updateObject = function (req, res) {

    var saveObject = function (err, group) {
        if (err) {
            return rest.sendError(res, err);
        } else {
            if (req.body.deploy) {
                group.lastDeployed = Date.now();
                Group.update({ _id: group._id }, { $set: {
                    lastDeployed: group.lastDeployed,
                    assets: group.assets,
                    deployedAssets: group.deployedAssets,
                    assetsValidity: group.assetsValidity
                }}).exec();
            }
            if ( req.body.exportAssets) {
                prepareExportZipFile(group);
            }
            return rest.sendSuccess(res, 'updated Group details', group);
        }
    }

    var object = req.object;
    delete req.body.__v;        //do not copy version key
    if (req.body.name && (object.name != req.body.name)) {
        fs.mkdir(path.join(config.syncDir, installation, req.body.name), function (err) {
            if (err && (err.code != 'EEXIST'))
                console.log('Unable to create a group folder in server: ' + err);
        });
    }
    object = _.extend(object, req.body);
    if (req.body.exportAssets) {
        exportAssets.inProgress = true;
        exportAssets.link = "";
        exportAssets.file = "";
        exportAssets.statusMessage = 'Preparing export archive ...';
    }
    if (req.body.deploy) {
        object.deployedPlaylists = object.playlists;
        object.deployedAssets = object.assets;
        object.deployedTicker = object.ticker;
    }

    //disable animation for the timebeing
    //object.animationEnable = false;
    object.save(function (err, data) {
        if (!err && req.body.deploy) {
            serverMain.deploy(installation,object, saveObject);
        } else {
            saveObject(err, object);
        }
    });

};


exports.deleteObject = function (req, res) {
    if (!req.object || req.object.name == "default")
        return rest.sendError(res,'No group specified or can not remove default group');

    var object = req.object;
    object.remove(function (err) {
        if (err)
            return rest.sendError(res, 'Unable to remove Group record', err);
        else
            return rest.sendSuccess(res, 'Group record deleted successfully');
    })
}

function createSettings(config) {

    var checkAndCopy = function(attr) {
        if (typeof config[attr] !== 'undefined') {
            //logger.log("info","changed settings for "+attr+" from "+settings[attr]+" to "+config[attr])
            settings[attr] = config[attr];
            return true;
        } else {
            return false;
        }
    }
    var settings = {};
    settings.name = config.name;
    settings.currentVersion = config.currentVersion;
    settings.assets = config.assets;
    settings.loadPlaylistOnCompletion = config.loadPlaylistOnCompletion || false;
    checkAndCopy("installation");
    checkAndCopy("secret");
    if (config.animationEnable) {
        settings.animationEnable = true;
        settings.animationType = config.animationType;
    } else {
        settings.animationEnable = false;
        settings.animationType = null;
    }
    checkAndCopy("sshPassword");
    checkAndCopy("signageBackgroundColor");
    checkAndCopy("imageLetterboxed");
    checkAndCopy("resizeAssets");
    checkAndCopy("videoKeepAspect");
    checkAndCopy("systemMessagesHide");
    checkAndCopy("forceTvOn");
    checkAndCopy("hideWelcomeNotice");
    checkAndCopy("omxVolume");
    checkAndCopy("timeToStopVideo");
    checkAndCopy("enableLog");
    checkAndCopy("reportIntervalMinutes");
    checkAndCopy("enableYoutubeDl");
    checkAndCopy("enableMpv");
    checkAndCopy("combineDefaultPlaylist");
    checkAndCopy("playAllEligiblePlaylists");
    checkAndCopy("urlReloadDisable");
    checkAndCopy("cpuSerialNumber");
    if (config.logo){
        settings.logo = config.logo;
        settings.logox = config.logox;
        settings.logoy = config.logoy;
    }
    settings.orientation = config.orientation || 'landscape';
    settings.resolution = config.resolution || '720p';
    checkAndCopy("sleep");
    checkAndCopy("reboot");
    checkAndCopy("showClock");
    checkAndCopy("kioskUi");
    checkAndCopy("emergencyMessage");
    checkAndCopy("TZ");
    checkAndCopy('assetsValidity');
    return settings;
}

function prepareExportZipFile(group) {
    const EXPORT_ASSETS_NAME = '_export_assets';
    const EXPORT_ASSETS_ARCHIVE = EXPORT_ASSETS_NAME + '.zip';
    const ZIP_CMD = 'zip -r ';

    const exportAssetsDir = path.join(config.mediaDir, EXPORT_ASSETS_NAME);
    const archiveFullPath = path.join(config.mediaDir, EXPORT_ASSETS_ARCHIVE);

    var settings= Settings.findOne({}, function (err, data) {
        settings = data;

    });

    async.waterfall([

        function(next) {
            // Cleanup and create fresh directory for export
            exec("rm -rf " + exportAssetsDir, function(error) {
                exec(" rm " + archiveFullPath, function(err) {
                    fs.mkdir(exportAssetsDir, function(err) {
                        if (err)
                            return next(err);
                        else
                            fs.mkdir(path.join(exportAssetsDir, 'assets'), function(err) {
                                return next(err);
                            });
                    });
                });
            });
        },
        function(next)  {
            // copy all assets to export directory
            require('fs-extra').copy(path.join(config.syncDir,settings.installation,group.name), path.join(exportAssetsDir, 'assets'), {dereference:true},function (err) {
                if (err) {
                    console.log("error","Asset copying error in exportAssets(to USB): " + err+','+group.name)
                }
                next(err);
            });
        },
        function(next) {
            //unzip all zip files into .repo repository
            var filesToUnzip = [];
            group.assets.forEach(function(filename){
                if ((filename).match(config.zipfileRegex)) {
                    filesToUnzip.push(filename);
                }
            })
            if (filesToUnzip.length == 0)
                return next();
        },
        function(next) {
            const username = settings.authCredentials.user;
            const password = settings.authCredentials.password;
            fs.writeFile(path.join(exportAssetsDir, '.wgetrc'), 'user = ' + username + '\npassword = ' + password, 'utf8', function(err) {
                if (err) {
                    console.log("error", "wgetrc file creation error in exportAssets(to USB): " + err + "," + settings.installation + ',' + group.name)
                    return next(err);
                }
                const hash = require("apache-md5")(password);
                fs.writeFile(path.join(exportAssetsDir, 'htpasswd'), username+":"+hash, 'utf8', function(err) {
                    if (err) {
                        console.log("error", "htpasswd file creation error in exportAssets(to USB): " + err + "," + settings.installation + ',' + group.name)
                    }
                    return next(err);
                })
            })
        },
        function(next) {
            var config = {};
            config.deployedPlaylists = group.deployedPlaylists;
            config.groupTicker = group.ticker;
            config.lastUpload = Date.now();
            config.localControl = false;
            fs.writeFile(path.join(exportAssetsDir, '_config.json'), JSON.stringify(config, null, 4), 'utf8', function(err){
                if(err) {
                    console.log("error", "_config.json file creation error in exportAssets(to USB): " + err + "," + settings.installation + ',' + group.name)
                }
                return next(err);
            })
        },
        function(next) {
            fs.writeFile(path.join(exportAssetsDir, '_timestamp.txt'), Date.now(), 'utf8', function(err){
                if(err) {
                    console.log("error", "_timestamp.txt file creation error in exportAssets(to USB): " + err + "," + settings.installation + ',' + group.name)
                }
                return next(err);
            })
        },
        function(next) {
            Player.find({'group._id': group._id }, null, { lean: 1 },
                function(err, players) {
                    next(err, players);
                });
        },
        function(players, next) {
            var licenseDir = path.join(config.licenseDir,settings.installation);
            var pipkgjson = {};
            try {
                pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
            } catch (e) {
                console.log("error","Could not read package.json for players: " + err+","+settings.installation)
            }
            async.eachSeries(players, function(player, series_cb) {
                async.waterfall([
                    function(cb_inner) {
                        var playerConfig = sendConfig.sendConfig( player, group, pipkgjson);
                        playerConfig.cpuSerialNumber = player.cpuSerialNumber;

                        var setting = createSettings(playerConfig);
                        var playerSettingsFile = path.join(exportAssetsDir, player.cpuSerialNumber + '_settings.json');
                        fs.writeFile(playerSettingsFile, JSON.stringify(setting, null, 4),'utf8', cb_inner);
                    },
                    function(cb_inner) {
                        var licenseSrc = path.join(licenseDir, 'license_' + player.cpuSerialNumber + '.txt');
                        var licenseDst = path.join(exportAssetsDir, 'license_' + player.cpuSerialNumber + '.txt');

                        require('fs-extra').copy(licenseSrc, licenseDst, {dereference:true},function (err) {
                            if (err) {
                                console.log("error","License copying error in exportAssets(to USB): " + err+","+settings.installation+','+licenseSrc)
                            }
                            cb_inner();
                        });
                    }
                ], function(err) {
                    series_cb(err);
                });
            }, function(err) {
                next(err);
            });
        },
        function(next) {
            exec(ZIP_CMD + ' ' + EXPORT_ASSETS_ARCHIVE + ' ' + EXPORT_ASSETS_NAME,
                { cwd: config.mediaDir },
                function(err, stdout, stderr) {
                    console.log("stdout: "+stdout);
                    console.log("stderr: "+stderr);
                    next(err || stderr, { stdout:stdout, stderr:stderr });
                });
        }
    ], function(err, result) {
        exportAssets.inProgress = false;
        if (!err) {
            exportAssets.link = "/media/"+EXPORT_ASSETS_ARCHIVE;
            exportAssets.file = 'D9ADBB67-BB4F-4D15-B5AE-2859E02E13A3.zip';
            exportAssets.statusMessage = 'Export file ready for download';
        } else {
            exportAssets.statusMessage = err;
        }
        exec(" rm -rf " + exportAssetsDir, function(error) {
            if (error) {
                console.log("error","assets dir cleanup error in exportAssets(to USB): " + error+","+settings.installation+','+group.name)
            }
        })
    })
}