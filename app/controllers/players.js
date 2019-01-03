'use strict;'

var mongoose = require('mongoose'),
    Player = mongoose.model('Player'),
    Group = mongoose.model('Group'),
    groups = require('./groups'),
    rest = require('../others/restware'),
    _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    config = require('../../config/config');

var oldSocketio = require('./server-socket'),
    newSocketio = require('./server-socket-new'),
    licenses = require('./licenses');

var installation,
    settings;

var pipkgjson ={},
    pipkgjsonBeta = {},
    fs = require('fs');

var readVersions = function() {
    try {
        pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
    } catch(e) {
        pipkgjson = {};
    }
    try {
        pipkgjsonBeta = JSON.parse(fs.readFileSync('data/releases/package-beta.json', 'utf8'))
    } catch(e) {
        pipkgjsonBeta = {};
    }
}
readVersions();

fs.mkdir(config.logStoreDir, function(err) {
    if (err && (err.code != 'EEXIST')) {
        console.log("Error creating logs directory, "+err.code)
    }
});


var activePlayers = {},
    lastCommunicationFromPlayers = {};
Player.update({"isConnected": true},{$set:{"isConnected": false}},{ multi: true }, function(err, num) {
    if (!err && num)
        console.log("Reset isConnected for "+num.nModified+" players");
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
                if (!err && player && player.isConnected) {
                    player.isConnected = false;
                    player.save();
                    console.log("disconnect: "+player.installation+"-"+player.name+";reason: checkPlayersWatchdog")
                }
                delete activePlayers[playerId];
                cb();
            })
        } else {
            activePlayers[playerId] = false;
            cb();
        }
    }, function (err) {
        readVersions() //update version of software
        setTimeout(checkPlayersWatchdog, 600000);    //cleanup every 10 minutes
    })
}

exports.updateDisconnectEvent = function(socketId, reason) {
    Player.findOne({socket:socketId}, function(err,player) {
        if (!err && player) {
            player.isConnected = false;
            player.save();
            delete activePlayers[player._id.toString()];
            console.log("disconnect: "+player.installation+"-"+player.name+";reason: "+reason)
        } else {
            //console.log("not able to find player for disconnect event: "+socketId);
        }
    })
}

var sendConfig = function (player, group, periodic) {
    var retObj = {};

    var groupPlaylists,
        groupAssets,
        groupTicker;

    if (group.deployedPlaylists && group.deployedPlaylists.length >0) {
        groupPlaylists = group.deployedPlaylists;
        groupAssets = group.deployedAssets;
        groupTicker = group.deployedTicker;
    } else {
        groupPlaylists = group.playlists;
        groupAssets = group.assets;
        groupTicker = group.ticker;
    }

    retObj.secret = group.name;
    groupPlaylists = groupPlaylists || [];
    if (!player.version || player.version.charAt(0) == "0") {
        if (groupPlaylists[0] && groupPlaylists[0].name)
            retObj.currentPlaylist = groupPlaylists[0].name
        else
            retObj.currentPlaylist = groupPlaylists[0];
    } else {
        retObj.playlists = groupPlaylists;
    }
    retObj.assets = groupAssets;
    retObj.assetsValidity = group.assetsValidity;
    retObj.groupTicker = groupTicker;
    retObj.lastDeployed = group.lastDeployed;
    retObj.installation = installation;
    retObj.TZ = player.TZ;
    retObj.location = player.configLocation || player.location ;
    retObj.baseUrl = '/sync_folders/' + installation + '/';
    retObj.name = player.name;
    retObj.resolution = group.resolution || '720p';
    retObj.orientation = group.orientation || 'landscape';
    retObj.enableMpv =  group.enableMpv || false;
    retObj.kioskUi = group.kioskUi || {enable: false};
    retObj.animationType =  group.animationType || "right";
    if (!player.version || parseInt(player.version.replace(/\D/g,"")) < 180)
        retObj.animationEnable =  false;
    else
        retObj.animationEnable =  group.animationEnable || false;
    retObj.resizeAssets = group.resizeAssets || false;
    retObj.videoKeepAspect = group.videoKeepAspect || false;
    retObj.imageLetterboxed = group.imageLetterboxed || false;
    retObj.sleep = group.sleep || {enable: false, ontime: null , offtime: null };
    retObj.reboot = group.reboot || {enable: false, time: null };
    retObj.signageBackgroundColor =  group.signageBackgroundColor || "#000";
    retObj.omxVolume = (group.omxVolume || group.omxVolume == 0)?group.omxVolume:100;
    retObj.timeToStopVideo = group.timeToStopVideo || 0;
    retObj.logo =  group.logo;
    retObj.logox =  group.logox;
    retObj.logoy =  group.logoy;
    retObj.showClock = group.showClock || {enable: false};
    retObj.emergencyMessage = group.emergencyMessage || {enable: false};
    retObj.combineDefaultPlaylist = group.combineDefaultPlaylist || false;
    retObj.playAllEligiblePlaylists = group.playAllEligiblePlaylists || false;
    retObj.urlReloadDisable =  group.urlReloadDisable || false;
    retObj.loadPlaylistOnCompletion =  group.loadPlaylistOnCompletion || false;
    //if (!pipkgjson)
        //pipkgjson = JSON.parse(fs.readFileSync('data/releases/package.json', 'utf8'))
    retObj.currentVersion = { version: pipkgjson.version, platform_version: pipkgjson.platform_version,
        beta: pipkgjsonBeta.version}
    // retObj.gcal = {
    //     id: config.gCalendar.CLIENT_ID,
    //     token: config.gCalendar.CLIENT_SECRET
    // }
    if (periodic) {
    }

    retObj.systemMessagesHide = settings.systemMessagesHide;
    retObj.forceTvOn = settings.forceTvOn;
    retObj.hideWelcomeNotice = settings.hideWelcomeNotice;
    retObj.reportIntervalMinutes=settings.reportIntervalMinutes;
    retObj.authCredentials = settings.authCredentials;
    retObj.enableLog = settings.enableLog || false;
    retObj.enableYoutubeDl = settings.enableYoutubeDl || false;
    if (settings.sshPassword)
        retObj.sshPassword = settings.sshPassword;
    retObj.currentTime = Date.now();
    var socketio = (player.newSocketIo?newSocketio:oldSocketio);
    socketio.emitMessage(player.socket, 'config', retObj);
}

//Load a object
exports.loadObject = function (req, res, next, id) {

    Player.load(id, function (err, object) {
        if (err || !object)
            return rest.sendError(res,'Unable to get group details',err);


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

    if (req.query['groupName']) {
        criteria['group.name'] = req.query['groupName'];
    }

    if (req.query['string']) {
        var str = new RegExp(req.query['string'], "i")
        criteria['name'] = str;
    }


    if (req.query['location']) {
        criteria['$or'] = [ {'location':req.query['location']}, {'configLocation':req.query['location']} ];
    }

    if (req.query['label']) {
        criteria['labels'] = req.query['label'];
    }

    if (req.query['currentPlaylist']) {
        criteria['currentPlaylist'] = req.query['currentPlaylist'];
    }

    if (req.query['version']) {
        criteria['version'] = req.query['version'];
    }

    var page = req.query['page'] > 0 ? req.query['page'] : 0
    var perPage = req.query['per_page'] || 500

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Player.list(options, function (err, objects) {
        if (err)
            return rest.sendError(res, 'Unable to get Player list', err);

        objects = objects || []

        var data = {
            objects: objects,
            page: page,
            pages: Math.ceil(objects.length / perPage),
            count: objects.length
        };
        data.currentVersion = {version: pipkgjson.version, platform_version: pipkgjson.platform_version,
                    beta: pipkgjsonBeta.version};
        return rest.sendSuccess(res, 'sending Player list', data);
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
        Group.findById(player.group._id, function(err,group) {
            if (!err && group) {
                sendConfig(player,group,true)
            } else {
                console.log("unable to find group for the player");
            }
        })
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
    async.series([
        function (next) {
            var playerGroup = {
                name: "__player__"+ object.cpuSerialNumber,
                installation: req.installation,
                _id: object.selfGroupId
            }

            if (!req.body.group || (req.body.group && req.body.group._id)){
                next()
            } else if (playerGroup._id){
                req.body.group = playerGroup
                next()
            } else {
                delete playerGroup._id;
                groups.newGroup(playerGroup,function(err,data){
                    if (err) {
                        console.log(err)
                    }
                    req.body.group = data.toObject()
                    object.selfGroupId = data._id;
                    next()
                })
            }
        },
        function (next) {
            object = _.extend(object, req.body)
            object.save(function (err, data) {
                if (err)
                    rest.sendError(res, 'Unable to update Player data', err);
                else
                    rest.sendSuccess(res, 'updated Player details', data);
                next()
            });
        }], function() {

            Group.findById(object.group._id, function (err, group) {
                if (!err && group) {
                    sendConfig(object, group, true)
                } else {
                    console.log("unable to find group for the player");
                }
            })
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
    perDayCount = 20 * 24;
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
                        var now = Date.now(),
                            pid = player._id.toString();
                        //throttle messages
                        if (!lastCommunicationFromPlayers[pid] || (now - lastCommunicationFromPlayers[pid]) > 60000 ||
                            obj.priority) {
                            lastCommunicationFromPlayers[pid] = now;
                            sendConfig(player,group, (updatePlayerCount[obj.cpuSerialNumber] === 1));
                        } else {
                            //console.log("communication to "+player.name+" at "+now+", last "+ lastCommunicationFromPlayers[pid]+" did not happen")
                        }
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
var shellCmdTimer = {};

exports.shell = function (req, res) {
    var cmd = req.body.cmd;
    var object = req.object,
        sid = object.socket;
    pendingCommands[sid] = res;
    var socketio = (object.newSocketIo?newSocketio:oldSocketio);
    socketio.emitMessage(sid, 'shell', cmd);

    clearTimeout(shellCmdTimer[sid]);
    shellCmdTimer[sid] = setTimeout(function(){
        delete shellCmdTimer[sid];
        if(pendingCommands[sid]){
            rest.sendSuccess(res,"Request Timeout",
                { err: "Could not get response from the player,Make sure player is online and try again."})
            pendingCommands[sid] = null;
        }
    },60000)
}

exports.shellAck = function (sid, response) {

    if (pendingCommands[sid]) {
        clearTimeout(shellCmdTimer[sid])
        delete shellCmdTimer[sid];
        rest.sendSuccess(pendingCommands[sid], 'Shell cmd response', response);
        pendingCommands[sid] = null;
    }

}

exports.swupdate = function (req, res) {
    var object = req.object,
        version = req.body.version || null;
    if (!version) {
        version = 'piimage'+pipkgjson.version+'.zip'
    }
    var socketio = (object.newSocketIo?newSocketio:oldSocketio);
    socketio.emitMessage(object.socket, 'swupdate',version);
    //console.log("updating to "+(version?version:'piimage'+pipkgjson.version+'.zip'));
    return rest.sendSuccess(res, 'SW update command issued');
}

exports.upload = function (cpuId, filename, data) {
    Player.findOne({cpuSerialNumber: cpuId}, function (err, player) {
        if (player) {
            var logData;
            if(filename.indexOf('forever_out') == 0 ){
                fs.writeFile(config.logStoreDir+'/'+cpuId+'_forever_out.log',data,function(err){
                    if(err) {
                        console.log("error", "Error in writing forever_out log for " + cpuId);
                        console.log(err);
                    }
                    // else
                    //     console.log("info","Forever Log file saved for player : "+cpuId);
                })
            } else if (path.extname(filename) == '.log' && filename != "forever_out.log") {
                try {
                    logData = JSON.parse(data);
                    logData.installation = player.installation;
                    logData.playerId = player._id.toString();
                } catch (e) {
                    //corrupt file
                    console.log(player.cpuSerialNumber)
                    console.log("corrupt log file: "+filename);
                }
            } else if (path.extname(filename) == '.events') {
                var lines = data.split('\n'),
                    events = [];
                for (var i = 0; i < lines.length; i++) {
                    //console.log(lines[i]);
                    try {
                        logData = JSON.parse(lines[i]);
                        if (logData.category == "file" || logData.description == "connected to server")
                            continue;
                        logData.installation = player.installation;
                        logData.playerId = player._id.toString();
                        events.push(logData);
                    } catch (e) {
                        //corrupt file
                        //console.log("corrupt log file: "+filename);
                    }
                }
            }
            var socketio = (player.newSocketIo?newSocketio:oldSocketio);
            socketio.emitMessage(player.socket, 'upload_ack', filename);
        } else {
            console.log("ignoring file upload: " + filename);
        }
    })
}

exports.tvPower = function(req,res){
    var status = req.body.status;
    var object = req.object;
    var socketio = (object.newSocketIo?newSocketio:oldSocketio);
    socketio.emitMessage(object.socket,'cmd','tvpower',{off: status} );
    return rest.sendSuccess(res,'TV command issued');
}



var snapShotTimer = {};
var pendingSnapshots = {};

exports.piScreenShot = function (sid,data) { // save screen shot in  _screenshots directory
    var img =  Buffer.from(data.data,"base64").toString("binary"),
        cpuId = data.playerInfo["cpuSerialNumber"];

    clearTimeout(snapShotTimer[cpuId])
    delete snapShotTimer[cpuId];

    fs.writeFile(path.join(config.thumbnailDir,cpuId + '.jpeg'), img, 'binary',function (err) {
        if (err)
            console.log('error in  saving screenshot for ' + cpuId, err);
        if (pendingSnapshots[cpuId]) {
            rest.sendSuccess(pendingSnapshots[cpuId], 'screen shot received',
                {
                    url: "/media/_thumbnails/"+cpuId+".jpeg",
                    lastTaken: Date.now()
                }
            );
            delete pendingSnapshots[cpuId];
        }
    })
}

exports.takeSnapshot = function (req, res) { // send socket.io event
    var object = req.object,
        cpuId = object.cpuSerialNumber;
    if (pendingSnapshots[cpuId])
        rest.sendError(res, 'snapshot taking in progress');
    else if (!object.isConnected) {
        fs.stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), function (err, stats) {
            rest.sendSuccess(res, 'player is offline, sending previous snapshot',
                {
                    url: "/media/_thumbnails/" + cpuId + ".jpeg",
                    lastTaken: stats ? stats.mtime : "NA"
                }
            );
        })
    } else {
        pendingSnapshots[cpuId] = res;
        snapShotTimer[cpuId] = setTimeout(function () {
            delete snapShotTimer[cpuId];
            delete pendingSnapshots[cpuId];
            fs.stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), function (err, stats) {
                rest.sendSuccess(res, 'screen shot command timeout',
                    {
                        url: "/media/_thumbnails/" + cpuId + ".jpeg",
                        lastTaken: stats ? stats.mtime : "NA"
                    }
                );
            })
        }, 60000)
        var socketio = (object.newSocketIo?newSocketio:oldSocketio);
        socketio.emitMessage(object.socket, 'snapshot');
    }
}


