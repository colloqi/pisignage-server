'use strict;'

var mongoose = require('mongoose'),
    Player = mongoose.model('Player'),
    Group = mongoose.model('Group'),
    rest = require('../others/restware'),
    _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    config = require('../../config/config');

var socketio = require('./server-socket'),
    licenses = require('./licenses');

var installation,
    settings;

var pipkgjson,
    fs = require('fs');

var activePlayers = {};
Player.find({"isConnected": true}, function (err, players) {
    if (err)
        return;
    players.forEach(function (player) {
        activePlayers[player._id.toString()] = false;
    })
    checkPlayersWatchdog();
})

var defaultGroup = {_id: 0, name: 'default'};
//create a default group if does not exist
licenses.getSettingsModel(function(err,data){
    settings = data;
    installation = settings.installation || "local"

    Group.update({name:"default"},{name:"default",description:"Default group for Players"},{upsert:true},function(err){
        fs.mkdir(path.join(config.syncDir,installation), function (err) {
            fs.mkdir(path.join(config.syncDir,installation, "default"), function (err) {
            })
        })
        Group.findOne({name: 'default'}, function (err, data) {
            if (!err && data)
                defaultGroup = data;
        });
    })
})


function checkPlayersWatchdog() {
    var playerIds = Object.keys(activePlayers);
    async.eachSeries(playerIds, function (playerId, cb) {
        if (!activePlayers[playerId]) {
            Player.findById(playerId, function (err, player) {
                if (!err && player) {
                    player.isConnected = false;
                    player.save();
                    delete activePlayers[playerId];
                }
                cb();
            })
        } else {
            activePlayers[playerId] = false;
            cb();
        }
    }, function (err) {
        setTimeout(checkPlayersWatchdog, 600000);    //cleanup every 10 minutes
    })
}

var sendConfig = function (player, group, periodic) {
    var retObj = {};
    retObj.secret = group.name;
    if (!player.version || player.version.charAt(0) == "0") {
        if (group.playlists[0] && group.playlists[0].name)
            retObj.currentPlaylist = group.playlists[0].name
        else
            retObj.currentPlaylist = group.playlists[0];
    } else {
        retObj.playlists = group.playlists || [];
    }
    retObj.installation = installation;
    retObj.TZ = player.TZ;
    retObj.baseUrl = '/sync_folders/' + installation + '/';
    retObj.assets = group.assets;
    retObj.lastDeployed = group.lastDeployed;
    retObj.name = player.name;
    retObj.resolution = group.resolution || '720p';
    retObj.orientation = group.orientation || 'landscape';
    retObj.animationEnable =  group.animationEnable || false;
    if (!pipkgjson)
        pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
    retObj.currentVersion = {version: pipkgjson.version, platform_version: pipkgjson.platform_version};
    retObj.gcal = {
        id: config.gCalendar.CLIENT_ID,
        token: config.gCalendar.CLIENT_SECRET
    }
    if (periodic) {
    }

    retObj.authCredentials = settings.authCredentials;
    retObj.assetLogEnable = settings.assetLogEnable;
    socketio.emitMessage(player.socket, 'config', retObj);
}

//Load a object
exports.loadObject = function (req, res, next, id) {

    Player.load(id, function (err, object) {
        if (err)
            return next(err)
        if (!object)
            return next(new Error('not found'))
        req.object = object;
        next();
    })
}

//list of objects
exports.index = function (req, res) {

    var criteria = {};


    if (req.query['group']) {
        criteria['group._id'] = req.query['group'];
    }

    if (req.query['string']) {
        var str = new RegExp(req.query['string'], "i")
        criteria['name'] = str;
    }

    var page = req.query['page'] > 0 ? req.query['page'] : 0
    var perPage = req.query['per_page'] || 500

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Player.list(options, function (err, objects) {
        if (err) return rest.sendError(res, 'Unable to get Player list', err);
        Player.count(options.criteria).exec(function (err, count) {
            var data = {
                objects: objects,
                page: page,
                pages: Math.ceil(count / perPage),
                count: count
            };
            pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
            data.currentVersion = {version: pipkgjson.version, platform_version: pipkgjson.platform_version};
            return rest.sendSuccess(res, 'sending Player list', data);
        })
    })
}

exports.getObject = function (req, res) {

    var object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Player details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Player details', err);
    }

};

exports.createObject = function (req, res) {

    var player;

    Player.findOne({cpuSerialNumber: req.body.cpuSerialNumber}, function (err, data) {

        if (err) {
            console.log("Error while retriving player data: " + err);
        }

        if (data) {
            delete req.body.__v;        //do not copy version key
            player = _.extend(data, req.body)
        } else {
            player = new Player(req.body);
            if (!player.group) player.group = defaultGroup;
        }
        player.registered = false;

        player.installation = installation;
        console.log(player);
        player.save(function (err, obj) {
            if (err) {
                return rest.sendError(res, 'Error in saving new Player', err || "");
            } else {
                return rest.sendSuccess(res, 'new Player added successfully', obj);
            }
        })
    })
}

exports.updateObject = function (req, res) {
    var object = req.object;

    if (req.body.group && req.object.group._id != req.body.group._id) {
        req.body.registered = false;
    }
    delete req.body.__v;        //do not copy version key
    object = _.extend(object, req.body)
    object.save(function (err, data) {
        if (err)
            return rest.sendError(res, 'Unable to update Player data', err);
        return rest.sendSuccess(res, 'updated Player details', data);
    });

    Group.findById(object.group._id, function (err, group) {
        if (!err && group) {
            sendConfig(object, group, true)
        } else {
            console.log("unable to find group for the player");
        }
    })
};


exports.deleteObject = function (req, res) {

    var object = req.object,
        playerId = object.cpuSerialNumber;
    object.remove(function (err) {
        if (err)
            return rest.sendError(res, 'Unable to remove Player record', err);
        else {
            return rest.sendSuccess(res, 'Player record deleted successfully');
        }
    })
}

var updatePlayerCount = {},
    perDayCount = 60 * 24;
exports.updatePlayerStatus = function (obj) {
    var retObj = {};

    updatePlayerCount[obj.cpuSerialNumber] = (updatePlayerCount[obj.cpuSerialNumber] || 0) + 1;
    if (updatePlayerCount[obj.cpuSerialNumber] > perDayCount) {
        updatePlayerCount[obj.cpuSerialNumber] = 0;
    }

    Player.findOne({cpuSerialNumber: obj.cpuSerialNumber}, function (err, data) {
        if (err) {
            console.log("Error while retriving player data: " + err);
        } else {
            var player;
            if (data) {
                if (!obj.lastUpload || (obj.lastUpload < data.lastUpload))
                    delete obj.lastUpload;
                if (!obj.name || obj.name.length == 0)
                    delete obj.name;
                player = _.extend(data, obj)
                if (!player.isConnected) {
                    player.isConnected = true;
                }
            } else {
                player = new Player(obj);
                player.group = defaultGroup;
                player.installation = installation;
                player.isConnected = true;
            }
            //server license feature, disable communication if server license is not available
            if (player.serverServiceDisabled)
                player.socket = null;

            activePlayers[player._id.toString()] = true;
            if (!player.registered || obj.request ) {
                Group.findById(player.group._id, function (err, group) {
                    if (!err && group) {
                        sendConfig(player, group, (updatePlayerCount[obj.cpuSerialNumber] === 1));
                    } else {
                        console.log("unable to find group for the player");
                    }
                })
            }
            player.save(function (err, player) {
                if (err) {
                    return console.log("Error while saving player status: " + err);
                }
            });
        }
    })
}

exports.secretAck = function (sid, status) {
    Player.findOne({socket: sid}, function (err, player) {
        if (!err && player) {
            player.registered = status;
            player.save();
        } else {
            console.log("not able to find player")
        }
    })
}

var pendingCommands = {};

exports.shell = function (req, res) {
    var cmd = req.body.cmd;
    var object = req.object;
    pendingCommands[object.socket] = res;
    socketio.emitMessage(object.socket, 'shell', cmd);
}

exports.shellAck = function (sid, response) {

    if (pendingCommands[sid])
        return rest.sendSuccess(pendingCommands[sid], 'Shell cmd response', response);

}

exports.swupdate = function (req, res) {
    var object = req.object;
    pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
    socketio.emitMessage(object.socket, 'swupdate', 'piimage' + pipkgjson.version + '.zip');
    return rest.sendSuccess(res, 'SW update command issued');
}

exports.upload = function (cpuId, filename, data) {
    Player.findOne({cpuSerialNumber: cpuId}, function (err, player) {
        if (player) {
            var logData;
            if (path.extname(filename) == '.log') {
                try {
                    logData = JSON.parse(data);
                    logData.installation = player.installation;
                    logData.playerId = player._id.toString();
                } catch (e) {
                    //corrupt file
                }
            } else if (path.extname(filename) == '.events') {
                var lines = data.split('\n'),
                    events = [];
                for (var i = 0; i < lines.length; i++) {
                    //console.log(lines[i]);
                    try {
                        logData = JSON.parse(lines[i]);
                        logData.installation = player.installation;
                        logData.playerId = player._id.toString();
                        events.push(logData);
                    } catch (e) {
                        //corrupt file
                    }
                }
            }
            socketio.emitMessage(player.socket, 'upload_ack', filename);
        } else {
            console.log("ignoring file upload: " + filename);
        }
    })
}

