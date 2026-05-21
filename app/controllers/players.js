

// var mongoose = require('mongoose'),
//     Player = mongoose.model('Player'),
//     Group = mongoose.model('Group'),
//     groups = require('./groups.js'),
//     rest = require('../others/restware.js'),
//     _ = require('lodash'),
//     path = require('path'),
//     async = require('async'),
//     config = require('../../config/config.js');

// var oldSocketio = require('./server-socket.js'),
//     newSocketio = require('./server-socket-new.js'),
//     webSocket = require('./server-socket-ws.js'),
//     licenses = require('./licenses.js');

// var installation,
//     settings;

// var pipkgjson ={},
//     pipkgjsonBeta = {},
//     pipkgjsonP2 ={};
//     fs = require('fs');

// var readVersions = function() {
//     try {
//         pipkgjson = JSON.parse(fs.readFileSync(path.join(config.releasesDir,'package.json'), 'utf8'))
//     } catch(e) {
//         pipkgjson = {};
//     }
//     try {
//         pipkgjsonBeta = JSON.parse(fs.readFileSync(path.join(config.releasesDir,'package-beta.json'), 'utf8'))
//     } catch(e) {
//         pipkgjsonBeta = {};
//     }
//     try{
//         pipkgjsonP2 = JSON.parse(fs.readFileSync(path.join(config.releasesDir,'package-p2.json'), 'utf8'));
//         pipkgjson.versionP2 = pipkgjsonP2.version;
//     }
//     catch(e) {
//         pipkgjsonP2 = {};
//     }
// }
// readVersions();

// fs.mkdir(config.logStoreDir, function(err) {
//     if (err && (err.code != 'EEXIST')) {
//         console.log("Error creating logs directory, "+err.code)
//     }
// });


// var activePlayers = {},
//     lastCommunicationFromPlayers = {};
// Player.update({"isConnected": true},{$set:{"isConnected": false}},{ multi: true }, function(err, num) {
//     if (!err && num)
//         console.log("Reset isConnected for "+num.nModified+" players");
//     checkPlayersWatchdog();
// })

// var defaultGroup = {_id: 0, name: 'default'};
// //create a default group if does not exist
// licenses.getSettingsModel(function(err,data){
//     settings = data;
//     installation = settings.installation || "local"

//     Group.update({name:"default"},{name:"default",description:"Default group for Players"},{upsert:true},function(err){
//         fs.mkdir(path.join(config.syncDir,installation), function (err) {
//             fs.mkdir(path.join(config.syncDir,installation, "default"), function (err) {
//             })
//         })
//         Group.findOne({name: 'default'}, function (err, data) {
//             if (!err && data)
//                 defaultGroup = data;
//         });
//     })
// })


// function checkPlayersWatchdog() {
//     var playerIds = Object.keys(activePlayers);
//     async.eachSeries(playerIds, function (playerId, cb) {
//         if (!activePlayers[playerId]) {
//             Player.findById(playerId, function (err, player) {
//                 if (!err && player && player.isConnected) {
//                     player.isConnected = false;
//                     player.save();
//                     console.log("disconnect: "+player.installation+"-"+player.name+";reason: checkPlayersWatchdog")
//                 }
//                 delete activePlayers[playerId];
//                 cb();
//             })
//         } else {
//             activePlayers[playerId] = false;
//             cb();
//         }
//     }, function (err) {
//         readVersions() //update version of software
//         setTimeout(checkPlayersWatchdog, 600000);    //cleanup every 10 minutes
//     })
// }

// exports.updateDisconnectEvent = function(socketId, reason) {
//     Player.findOne({socket:socketId}, function(err,player) {
//         if (!err && player) {
//             player.isConnected = false;
//             player.save();
//             delete activePlayers[player._id.toString()];
//             console.log("disconnect: "+player.installation+"-"+player.name+";reason: "+reason)
//         } else {
//             //console.log("not able to find player for disconnect event: "+socketId);
//         }
//     })
// }

// var sendConfig = function (player, group, periodic) {
//     var retObj = {};

//     var groupPlaylists,
//         groupAssets,
//         groupTicker;

//     if (group.deployedPlaylists && group.deployedPlaylists.length >0) {
//         groupPlaylists = group.deployedPlaylists;
//         groupAssets = group.deployedAssets;
//         groupTicker = group.deployedTicker;
//     } else {
//         groupPlaylists = group.playlists;
//         groupAssets = group.assets;
//         groupTicker = group.ticker;
//     }

//     retObj.secret = group.name;
//     groupPlaylists = groupPlaylists || [];
//     if (!player.version || player.version.charAt(0) == "0") {
//         if (groupPlaylists[0] && groupPlaylists[0].name)
//             retObj.currentPlaylist = groupPlaylists[0].name
//         else
//             retObj.currentPlaylist = groupPlaylists[0];
//     } else {
//         retObj.playlists = groupPlaylists;
//     }
//     retObj.assets = groupAssets;
//     retObj.assetsValidity = group.assetsValidity;
//     retObj.groupTicker = groupTicker;
//     retObj.lastDeployed = group.lastDeployed;
//     retObj.installation = installation;
//     retObj.TZ = player.TZ;
//     retObj.location = player.configLocation || player.location ;
//     retObj.baseUrl = '/sync_folders/' + installation + '/';
//     retObj.name = player.name;
//     retObj.resolution = group.resolution || '720p';
//     retObj.orientation = group.orientation || 'landscape';
//     retObj.enableMpv =  group.enableMpv || false;
//     retObj.mpvAudioDelay =  group.mpvAudioDelay || '0';
//     retObj.selectedVideoPlayer =  group.selectedVideoPlayer || 'default';
//     retObj.kioskUi = group.kioskUi || {enable: false};
//     retObj.animationType =  group.animationType || "right";
//     if (!player.version || parseInt(player.version.replace(/\D/g,"")) < 180)
//         retObj.animationEnable =  false;
//     else
//         retObj.animationEnable =  group.animationEnable || false;
//     retObj.resizeAssets = group.resizeAssets || false;
//     retObj.videoKeepAspect = group.videoKeepAspect || false;
//     retObj.videoShowSubtitles = group.videoShowSubtitles || false;
//     retObj.imageLetterboxed = group.imageLetterboxed || false;
//     retObj.brightness = group.brightness || { defaults: { control: 'None', level: 'Bright' }, schedule: [] };
//     retObj.sleep = group.sleep || {enable: false, ontime: null , offtime: null };
//     retObj.reboot = group.reboot || {enable: false, time: null,absoluteTime: null };
//     retObj.signageBackgroundColor =  group.signageBackgroundColor || "#000";
//     retObj.omxVolume = (group.omxVolume || group.omxVolume == 0)?group.omxVolume:100;
//     retObj.timeToStopVideo = group.timeToStopVideo || 0;
//     retObj.logo =  group.logo;
//     retObj.logox =  group.logox;
//     retObj.logoy =  group.logoy;
//     retObj.showClock = group.showClock || {enable: false};
//     retObj.monitorArrangement = group.monitorArrangement || { mode: "mirror"};
//     retObj.emergencyMessage = group.emergencyMessage || {enable: false};
//     retObj.combineDefaultPlaylist = group.combineDefaultPlaylist || false;
//     retObj.playAllEligiblePlaylists = group.playAllEligiblePlaylists || false;
//     retObj.shuffleContent = group.shuffleContent || false;
//     retObj.alternateContent = group.alternateContent || false;
//     retObj.urlReloadDisable =  group.urlReloadDisable || false;
//     retObj.keepWeblinksInMemory =  group.keepWeblinksInMemory || false;
//     retObj.loadPlaylistOnCompletion =  group.loadPlaylistOnCompletion || false;
//     retObj.disableWebUi =  group.disableWebUi || false;
//     retObj.disableWarnings =  group.disableWarnings || false;
//     retObj.disableAp =  group.disableAp || false;
//     retObj.enablePio =  group.enablePio || false;

//     //if (!pipkgjson)
//         //pipkgjson = JSON.parse(fs.readFileSync(path.join(config.releasesDir,'package.json'), 'utf8'))
//     retObj.currentVersion = { 
//         version: pipkgjson.version, platform_version: pipkgjson.platform_version,
//         beta: pipkgjsonBeta.version,
//         versionP2:pipkgjson.versionP2
//     }
//     // retObj.gcal = {
//     //     id: config.gCalendar.CLIENT_ID,
//     //     token: config.gCalendar.CLIENT_SECRET
//     // }
//     if (periodic) {
//     }

//     retObj.systemMessagesHide = settings.systemMessagesHide;
//     retObj.forceTvOn = settings.forceTvOn;
//     retObj.disableCECPowerCheck = settings.disableCECPowerCheck;
//     retObj.hideWelcomeNotice = settings.hideWelcomeNotice;
//     retObj.reportIntervalMinutes=settings.reportIntervalMinutes;
//     retObj.authCredentials = settings.authCredentials;
//     retObj.enableLog = settings.enableLog || false;
//     retObj.enableYoutubeDl = true;
//     if (settings.sshPassword)
//         retObj.sshPassword = settings.sshPassword;
//     retObj.currentTime = Date.now();
//     var socketio = (player.webSocket?webSocket:(player.newSocketIo?newSocketio:oldSocketio));
//     socketio.emitMessage(player.socket, 'config', retObj);
// }

// //Load a object
// exports.loadObject = function (req, res, next, id) {

//     Player.load(id, function (err, object) {
//         if (err || !object)
//             return rest.sendError(res,'Unable to get group details',err);


//         req.object = object;
//         next();
//     })
// }

// //list of objects
// exports.index = function (req, res) {

//     var criteria = {};


//     if (req.query['group']) {
//         criteria['group._id'] = req.query['group'];
//     }

//     if (req.query['groupName']) {
//         criteria['group.name'] = req.query['groupName'];
//     }

//     if (req.query['string']) {
//         var str = new RegExp(req.query['string'], "i")
//         criteria['name'] = str;
//     }


//     if (req.query['location']) {
//         criteria['$or'] = [ {'location':req.query['location']}, {'configLocation':req.query['location']} ];
//     }

//     if (req.query['label']) {
//         criteria['labels'] = req.query['label'];
//     }

//     if (req.query['currentPlaylist']) {
//         criteria['currentPlaylist'] = req.query['currentPlaylist'];
//     }

//     if (req.query['version']) {
//         criteria['version'] = req.query['version'];
//     }

//     var page = req.query['page'] > 0 ? req.query['page'] : 0
//     var perPage = req.query['per_page'] || 500

//     var options = {
//         perPage: perPage,
//         page: page,
//         criteria: criteria
//     }

//     Player.list(options, function (err, objects) {
//         if (err)
//             return rest.sendError(res, 'Unable to get Player list', err);

//         objects = objects || []

//         var data = {
//             objects: objects,
//             page: page,
//             pages: Math.ceil(objects.length / perPage),
//             count: objects.length
//         };
//         data.currentVersion = {
//                     version: pipkgjson.version, platform_version: pipkgjson.platform_version,
//                     beta: pipkgjsonBeta.version,
//                     versionP2:pipkgjson.versionP2
//                 };
//         return rest.sendSuccess(res, 'sending Player list', data);
//     })
// }

// exports.getObject = function (req, res) {

//     var object = req.object;
//     if (object) {
//         return rest.sendSuccess(res, 'Player details', object);
//     } else {
//         return rest.sendError(res, 'Unable to retrieve Player details', err);
//     }

// };

// exports.createObject = function (req, res) {

//     var player;

//     Player.findOne({cpuSerialNumber: req.body.cpuSerialNumber}, function (err, data) {

//         if (err) {
//             console.log("Error while retriving player data: " + err);
//         }

//         if (data) {
//             delete req.body.__v;        //do not copy version key
//             player = _.extend(data, req.body)
//         } else {
//             player = new Player(req.body);
//             if (!player.group) player.group = defaultGroup;
//         }
//         player.registered = false;

//         player.installation = installation;
//         console.log(player);
//         Group.findById(player.group._id, function(err,group) {
//             if (!err && group) {
//                 sendConfig(player,group,true)
//             } else {
//                 console.log("unable to find group for the player");
//             }
//         })
//         player.save(function (err, obj) {
//             if (err) {
//                 return rest.sendError(res, 'Error in saving new Player', err || "");
//             } else {
//                 return rest.sendSuccess(res, 'new Player added successfully', obj);
//             }
//         })
//     })
// }

// exports.updateObject = function (req, res) {
//     var object = req.object;

//     if (req.body.group && req.object.group._id != req.body.group._id) {
//         req.body.registered = false;
//     }
//     delete req.body.__v;        //do not copy version key
//     async.series([
//         function (next) {
//             var playerGroup = {
//                 name: "__player__"+ object.cpuSerialNumber,
//                 installation: req.installation,
//                 _id: object.selfGroupId
//             }

//             if (!req.body.group || (req.body.group && req.body.group._id)){
//                 next()
//             } else if (playerGroup._id){
//                 req.body.group = playerGroup
//                 next()
//             } else {
//                 delete playerGroup._id;
//                 groups.newGroup(playerGroup,function(err,data){
//                     if (err) {
//                         console.log(err)
//                     }
//                     req.body.group = data.toObject()
//                     object.selfGroupId = data._id;
//                     next()
//                 })
//             }
//         },
//         function (next) {
//             object = _.extend(object, req.body)
//             object.save(function (err, data) {
//                 if (err)
//                     rest.sendError(res, 'Unable to update Player data', err);
//                 else
//                     rest.sendSuccess(res, 'updated Player details', data);
//                 next()
//             });
//         }], function() {

//             Group.findById(object.group._id, function (err, group) {
//                 if (!err && group) {
//                     sendConfig(object, group, true)
//                 } else {
//                     console.log("unable to find group for the player");
//                 }
//             })
//     })
// };


// exports.deleteObject = function (req, res) {

//     var object = req.object,
//         playerId = object.cpuSerialNumber;
//     object.remove(function (err) {
//         if (err)
//             return rest.sendError(res, 'Unable to remove Player record', err);
//         else {
//             return rest.sendSuccess(res, 'Player record deleted successfully');
//         }
//     })
// }

// var updatePlayerCount = {},
//     perDayCount = 20 * 24;
// exports.updatePlayerStatus = function (obj) {
//     var retObj = {};

//     updatePlayerCount[obj.cpuSerialNumber] = (updatePlayerCount[obj.cpuSerialNumber] || 0) + 1;
//     if (updatePlayerCount[obj.cpuSerialNumber] > perDayCount) {
//         updatePlayerCount[obj.cpuSerialNumber] = 0;
//     }

//     Player.findOne({cpuSerialNumber: obj.cpuSerialNumber}, function (err, data) {
//         if (err) {
//             console.log("Error while retriving player data: " + err);
//         } else {
//             var player;
//             if (data) {
//                 if (!obj.lastUpload || (obj.lastUpload < data.lastUpload))
//                     delete obj.lastUpload;
//                 if (!obj.name || obj.name.length == 0)
//                     delete obj.name;
//                 player = _.extend(data, obj)
//                 if (!player.isConnected) {
//                     player.isConnected = true;
//                 }
//             } else {
//                 player = new Player(obj);
//                 player.group = defaultGroup;
//                 player.installation = installation;
//                 player.isConnected = true;
//             }
//             //server license feature, disable communication if server license is not available
//             if (player.serverServiceDisabled)
//                 player.socket = null;

//             activePlayers[player._id.toString()] = true;
//             if (!player.registered || obj.request ) {
//                 Group.findById(player.group._id, function (err, group) {
//                     if (!err && group) {
//                         var now = Date.now(),
//                             pid = player._id.toString();
//                         //throttle messages
//                         if (!lastCommunicationFromPlayers[pid] || (now - lastCommunicationFromPlayers[pid]) > 60000 ||
//                             obj.priority) {
//                             lastCommunicationFromPlayers[pid] = now;
//                             sendConfig(player,group, (updatePlayerCount[obj.cpuSerialNumber] === 1));
//                         } else {
//                             //console.log("communication to "+player.name+" at "+now+", last "+ lastCommunicationFromPlayers[pid]+" did not happen")
//                         }
//                     } else {
//                         console.log("unable to find group for the player");
//                     }
//                 })
//             }
//             player.save(function (err, player) {
//                 if (err) {
//                     return console.log("Error while saving player status: " + err);
//                 }
//             });
//         }
//     })
// }

// exports.secretAck = function (sid, status) {
//     Player.findOne({socket: sid}, function (err, player) {
//         if (!err && player) {
//             player.registered = status;
//             player.save();
//         } else {
//             console.log("not able to find player")
//         }
//     })
// }

// var pendingCommands = {};
// var shellCmdTimer = {};

// exports.shell = function (req, res) {
//     var cmd = req.body.cmd;
//     var object = req.object,
//         sid = object.socket;
//     pendingCommands[sid] = res;
//     var socketio = (object.webSocket?webSocket:(object.newSocketIo?newSocketio:oldSocketio));
//     socketio.emitMessage(sid, 'shell', cmd);

//     clearTimeout(shellCmdTimer[sid]);
//     shellCmdTimer[sid] = setTimeout(function(){
//         delete shellCmdTimer[sid];
//         if(pendingCommands[sid]){
//             rest.sendSuccess(res,"Request Timeout",
//                 { err: "Could not get response from the player,Make sure player is online and try again."})
//             pendingCommands[sid] = null;
//         }
//     },60000)
// }

// exports.shellAck = function (sid, response) {

//     if (pendingCommands[sid]) {
//         clearTimeout(shellCmdTimer[sid])
//         delete shellCmdTimer[sid];
//         rest.sendSuccess(pendingCommands[sid], 'Shell cmd response', response);
//         pendingCommands[sid] = null;
//     }

// }

// var pendingPlaylistChanges = {};
// var playlistChangeTimers = {};

// var pendingPlayerActions = {
//     pause: {},
//     forward: {},
//     backward: {}
// };
// var playerActionTimers = {
//     pause: {},
//     forward: {},
//     backward: {}
// };

// exports.playlistMedia = function (req, res) {
//     var object = req.object,
//         sid = object.socket;
//     var action = req.params.action;

//     // logger.log('info', 'Player action: ' + action);
//     var socketIO = (object.newSocketIo?newSocketio:oldSocketio);
//     socketIO.emitMessage(sid, 'playlist_media', action);

//     pendingPlayerActions[action][sid] = res;
//     clearTimeout(playerActionTimers[action][sid]);

//     playerActionTimers[action][sid] = setTimeout(function(){
//         if (playerActionTimers[action][sid]) {
//             delete playerActionTimers[action][sid];
//             rest.sendSuccess(res, 'Request Timeout',
//                 { err: 'No response from the player, make sure the player is online and try again.'});
//             pendingPlayerActions[action][sid] = null;
//         }
//     },60000)

// };


// exports.setPlaylist = function(req, res) {
//     var object = req.object;
//     var playlist = req.params.playlist;
//     var sid = object.socket;
//     var socketIo = (object.newSocketIo ? newSocketio : oldSocketio);
//     socketIo.emitMessage(sid, 'setplaylist', playlist);

//     pendingPlaylistChanges[sid] = res;
//     clearTimeout(playlistChangeTimers[sid]);
//     playlistChangeTimers[sid] = setTimeout(function() {
//         delete playlistChangeTimers[sid];
//         if (pendingPlaylistChanges[sid]) {
//             var errMsg = 'Could not get response from the player for changing playlist, make sure player is online';
//             rest.sendSuccess(res, 'Request Timeout', { err: errMsg });
//             pendingPlaylistChanges[sid] = null;
//         }
//     }, 60000);
// };

// exports.playlistMediaAck = function(sid, response) {
//     var data = {};

//     if (response.action && pendingPlayerActions[response.action][sid]) {
//         clearTimeout(playerActionTimers[response.action][sid]);
//         delete playerActionTimers[response.action][sid];
//         data.action = response.action;
//         if (response.action === 'pause') {
//             data.isPaused = response.isPaused;
//         }
//         rest.sendSuccess(pendingPlayerActions[response.action][sid], response.msg, data);
//         pendingPlayerActions[response.action][sid] = null;
//     }
// };

// exports.playlistChangeAck = function(sid, response) {
//     if (pendingPlaylistChanges[sid]) {
//         clearTimeout(playlistChangeTimers[sid]);
//         delete playlistChangeTimers[sid];
//         rest.sendSuccess(pendingPlaylistChanges[sid], 'Playlist change response', response);
//         pendingPlaylistChanges[sid] = null;
//     }
// };

// exports.swupdate = function (req, res) {
//     var object = req.object,
//         version = req.body.version || null;
//     if (!version) {
//         version = 'piimage'+pipkgjson.version+'.zip'
//     }
//     var socketio = (object.webSocket?webSocket:(object.newSocketIo?newSocketio:oldSocketio));
//     socketio.emitMessage(object.socket, 'swupdate',version,'piimage'+pipkgjson.versionP2+'-p2.zip');
//     //console.log("updating to "+(version?version:'piimage'+pipkgjson.version+'.zip'));
//     return rest.sendSuccess(res, 'SW update command issued');
// }

// exports.upload = function (cpuId, filename, data) {
//     Player.findOne({cpuSerialNumber: cpuId}, function (err, player) {
//         if (player) {
//             var logData;
//             if(filename.indexOf('forever_out') == 0 ){
//                 fs.writeFile(config.logStoreDir+'/'+cpuId+'_forever_out.log',data,function(err){
//                     if(err) {
//                         console.log("error", "Error in writing forever_out log for " + cpuId);
//                         console.log(err);
//                     }
//                     // else
//                     //     console.log("info","Forever Log file saved for player : "+cpuId);
//                 })
//             } else if (path.extname(filename) == '.log' && filename.indexOf('forever_out.log')===-1 ) {
//                 try {
//                     logData = JSON.parse(data);
//                     logData.installation = player.installation;
//                     logData.playerId = player._id.toString();
//                 } catch (e) {
//                     //corrupt file
//                     console.log(player.cpuSerialNumber)
//                     console.log("corrupt log file: "+filename);
//                 }
//             } else if (path.extname(filename) == '.events') {
//                 var lines = data.split('\n'),
//                     events = [];
//                 for (var i = 0; i < lines.length; i++) {
//                     //console.log(lines[i]);
//                     try {
//                         logData = JSON.parse(lines[i]);
//                         if (logData.category == "file" || logData.description == "connected to server")
//                             continue;
//                         logData.installation = player.installation;
//                         logData.playerId = player._id.toString();
//                         events.push(logData);
//                     } catch (e) {
//                         //corrupt file
//                         //console.log("corrupt log file: "+filename);
//                     }
//                 }
//             }
//             var socketio = (player.webSocket?webSocket:(player.newSocketIo?newSocketio:oldSocketio));
//             socketio.emitMessage(player.socket, 'upload_ack', filename);
//         } else {
//             console.log("ignoring file upload: " + filename);
//         }
//     })
// }

// exports.tvPower = function(req,res){
//     var object = req.object,
//         cmd = req.body.cmd || "tvpower",
//         arg;
//     if (cmd =="debuglevel") {
//         arg = {level: req.body.level }
//     } else if (cmd == "tvpower") {
//         arg =  {off: req.body.status}
//     }

//     var socketio = (object.webSocket?webSocket:(object.newSocketIo?newSocketio:oldSocketio));
//     socketio.emitMessage(object.socket,'cmd',cmd,arg );
//     return rest.sendSuccess(res,'Player command issued');
// }



// var snapShotTimer = {};
// var pendingSnapshots = {};

// exports.piScreenShot = function (sid,data) { // save screen shot in  _screenshots directory
//     var img =  Buffer.from(data.data,"base64").toString("binary"),
//         cpuId = data.playerInfo["cpuSerialNumber"];

//     clearTimeout(snapShotTimer[cpuId])
//     delete snapShotTimer[cpuId];

//     fs.writeFile(path.join(config.thumbnailDir,cpuId + '.jpeg'), img, 'binary',function (err) {
//         if (err)
//             console.log('error in  saving screenshot for ' + cpuId, err);
//         if (pendingSnapshots[cpuId]) {
//             rest.sendSuccess(pendingSnapshots[cpuId], 'screen shot received',
//                 {
//                     url: "/media/_thumbnails/"+cpuId+".jpeg",
//                     lastTaken: Date.now()
//                 }
//             );
//             delete pendingSnapshots[cpuId];
//         }
//     })
// }

// exports.takeSnapshot = function (req, res) { // send socket.io event
//     var object = req.object,
//         cpuId = object.cpuSerialNumber;
//     if (pendingSnapshots[cpuId])
//         rest.sendError(res, 'snapshot taking in progress');
//     else if (!object.isConnected) {
//         fs.stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), function (err, stats) {
//             rest.sendSuccess(res, 'player is offline, sending previous snapshot',
//                 {
//                     url: "/media/_thumbnails/" + cpuId + ".jpeg",
//                     lastTaken: stats ? stats.mtime : "NA"
//                 }
//             );
//         })
//     } else {
//         pendingSnapshots[cpuId] = res;
//         snapShotTimer[cpuId] = setTimeout(function () {
//             delete snapShotTimer[cpuId];
//             delete pendingSnapshots[cpuId];
//             fs.stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), function (err, stats) {
//                 rest.sendSuccess(res, 'screen shot command timeout',
//                     {
//                         url: "/media/_thumbnails/" + cpuId + ".jpeg",
//                         lastTaken: stats ? stats.mtime : "NA"
//                     }
//                 );
//             })
//         }, 60000)
//         var socketio = (object.webSocket?webSocket:(object.newSocketIo?newSocketio:oldSocketio));
//         socketio.emitMessage(object.socket, 'snapshot');
//     }
// }


// ES6 imports
import mongoose from 'mongoose';
import { Player } from '../models/player.js';
import { Group } from '../models/group.js';
import * as groups from './groups.js';
import * as rest from '../others/restware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../../config/config.js';
import fs from 'fs';
import { readFileSync, writeFile, stat } from 'fs';
import { mkdir } from 'fs/promises';
import * as oldSocketio from './server-socket.js';
import * as newSocketio from './server-socket-new.js';
import * as webSocket from './server-socket-ws.js';
import * as licenses from './licenses.js';

// ES6 __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let installation, settings;

let pipkgjson = {};
let pipkgjsonBeta = {};
let pipkgjsonP2 = {};

const readVersions = () => {
    try {
        pipkgjson = JSON.parse(readFileSync(path.join(config.releasesDir, 'package.json'), 'utf8'));
    } catch(e) {
        pipkgjson = {};
    }
    try {
        pipkgjsonBeta = JSON.parse(readFileSync(path.join(config.releasesDir, 'package-beta.json'), 'utf8'));
    } catch(e) {
        pipkgjsonBeta = {};
    }
    try {
        pipkgjsonP2 = JSON.parse(readFileSync(path.join(config.releasesDir, 'package-p2.json'), 'utf8'));
        pipkgjson.versionP2 = pipkgjsonP2.version;
    } catch(e) {
        pipkgjsonP2 = {};
    }
};

readVersions();

// Create logs directory
await mkdir(config.logStoreDir, { recursive: true }).catch((err) => {
    if (err.code !== 'EEXIST') {
        console.log(`Error creating logs directory: ${err.code}`);
    }
});

const activePlayers = {};
const lastCommunicationFromPlayers = {};

// Initialize: Reset isConnected for all players (Mongoose 8)
(async () => {
    try {
        const result = await Player.updateMany(
            { isConnected: true },
            { $set: { isConnected: false } }
        );
        if (result.modifiedCount) {
            console.log(`Reset isConnected for ${result.modifiedCount} players`);
        }
        checkPlayersWatchdog();
    } catch (err) {
        console.error('Error resetting player connections:', err);
    }
})();

let defaultGroup = { _id: 0, name: 'default' };

// Initialize default group and settings
(async () => {
    try {
        const data = await licenses.getSettingsModel();
        settings = data;
        installation = settings.installation || "local";

        await Group.updateOne(
            { name: "default" },
            { name: "default", description: "Default group for Players" },
            { upsert: true }
        );

        // Create directories
        try {
            await mkdir(path.join(config.syncDir, installation, "default"), { recursive: true });
        } catch (err) {
            // Only log non-EEXIST errors
            if (err.code !== 'EEXIST') {
                console.error('Failed to create sync folders:', err);
            }
            // Continue regardless (folder exists or was created)
        }

        const group = await Group.findOne({ name: 'default' });
        if (group) {
            defaultGroup = group;
        }
    } catch (err) {
        console.error('Error initializing:', err);
    }
})();

async function checkPlayersWatchdog() {
    const playerIds = Object.keys(activePlayers);
    
    // Replace async.eachSeries with for...of loop
    for (const playerId of playerIds) {
        try {
            if (!activePlayers[playerId]) {
                const player = await Player.findById(playerId);
                if (player && player.isConnected) {
                    player.isConnected = false;
                    await player.save();
                    console.log(`disconnect: ${player.installation}-${player.name};reason: checkPlayersWatchdog`);
                }
                delete activePlayers[playerId];
            } else {
                activePlayers[playerId] = false;
            }
        } catch (err) {
            console.error(`Error in watchdog for player ${playerId}:`, err);
        }
    }
    
    readVersions(); // Update version of software
    setTimeout(checkPlayersWatchdog, 600000); // Cleanup every 10 minutes
}

export const updateDisconnectEvent = async (socketId, reason) => {
    try {
        const player = await Player.findOne({ socket: socketId });
        if (player) {
            player.isConnected = false;
            await player.save();
            delete activePlayers[player._id.toString()];
            console.log(`disconnect: ${player.installation}-${player.name};reason: ${reason}`);
        }
    } catch (err) {
        console.error('Error in updateDisconnectEvent:', err);
    }
};

const sendConfig = (player, group, periodic) => {
    const retObj = {};

    let groupPlaylists, groupAssets, groupTicker;

    if (group.deployedPlaylists && group.deployedPlaylists.length > 0) {
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
    
    if (!player.version || player.version.charAt(0) === "0") {
        if (groupPlaylists[0] && groupPlaylists[0].name) {
            retObj.currentPlaylist = groupPlaylists[0].name;
        } else {
            retObj.currentPlaylist = groupPlaylists[0];
        }
    } else {
        retObj.playlists = groupPlaylists;
    }
    
    retObj.assets = groupAssets;
    retObj.assetsValidity = group.assetsValidity;
    retObj.groupTicker = groupTicker;
    retObj.lastDeployed = group.lastDeployed;
    retObj.installation = installation;
    retObj.TZ = player.TZ;
    retObj.location = player.configLocation || player.location;
    retObj.baseUrl = `/sync_folders/${installation}/`;
    retObj.name = player.name;
    retObj.resolution = group.resolution || '720p';
    retObj.orientation = group.orientation || 'landscape';
    retObj.enableMpv = group.enableMpv || false;
    retObj.mpvAudioDelay = group.mpvAudioDelay || '0';
    retObj.selectedVideoPlayer = group.selectedVideoPlayer || 'default';
    retObj.kioskUi = group.kioskUi || { enable: false };
    retObj.animationType = group.animationType || "right";
    
    if (!player.version || parseInt(player.version.replace(/\D/g, "")) < 180) {
        retObj.animationEnable = false;
    } else {
        retObj.animationEnable = group.animationEnable || false;
    }
    
    retObj.resizeAssets = group.resizeAssets || false;
    retObj.videoKeepAspect = group.videoKeepAspect || false;
    retObj.videoShowSubtitles = group.videoShowSubtitles || false;
    retObj.imageLetterboxed = group.imageLetterboxed || false;
    retObj.brightness = group.brightness || { defaults: { control: 'None', level: 'Bright' }, schedule: [] };
    retObj.sleep = group.sleep || { enable: false, ontime: null, offtime: null };
    retObj.reboot = group.reboot || { enable: false, time: null, absoluteTime: null };
    retObj.signageBackgroundColor = group.signageBackgroundColor || "#000";
    retObj.omxVolume = (group.omxVolume || group.omxVolume === 0) ? group.omxVolume : 100;
    retObj.timeToStopVideo = group.timeToStopVideo || 0;
    retObj.logo = group.logo;
    retObj.logox = group.logox;
    retObj.logoy = group.logoy;
    retObj.showClock = group.showClock || { enable: false };
    retObj.monitorArrangement = group.monitorArrangement || { mode: "mirror" };
    retObj.emergencyMessage = group.emergencyMessage || { enable: false };
    retObj.combineDefaultPlaylist = group.combineDefaultPlaylist || false;
    retObj.playAllEligiblePlaylists = group.playAllEligiblePlaylists || false;
    retObj.shuffleContent = group.shuffleContent || false;
    retObj.alternateContent = group.alternateContent || false;
    retObj.urlReloadDisable = group.urlReloadDisable || false;
    retObj.keepWeblinksInMemory = group.keepWeblinksInMemory || false;
    retObj.loadPlaylistOnCompletion = group.loadPlaylistOnCompletion || false;
    retObj.disableWebUi = group.disableWebUi || false;
    retObj.disableWarnings = group.disableWarnings || false;
    retObj.disableAp = group.disableAp || false;
    retObj.enablePio = group.enablePio || false;

    retObj.currentVersion = { 
        version: pipkgjson.version,
        platform_version: pipkgjson.platform_version,
        beta: pipkgjsonBeta.version,
        versionP2: pipkgjson.versionP2
    };

    retObj.systemMessagesHide = settings.systemMessagesHide;
    retObj.forceTvOn = settings.forceTvOn;
    retObj.disableCECPowerCheck = settings.disableCECPowerCheck;
    retObj.hideWelcomeNotice = settings.hideWelcomeNotice;
    retObj.reportIntervalMinutes = settings.reportIntervalMinutes;
    retObj.authCredentials = settings.authCredentials;
    retObj.enableLog = settings.enableLog || false;
    retObj.enableYoutubeDl = true;
    
    if (settings.sshPassword) {
        retObj.sshPassword = settings.sshPassword;
    }
    
    retObj.currentTime = Date.now();
    
    const socketio = player.webSocket ? webSocket : (player.newSocketIo ? newSocketio : oldSocketio);
    socketio.emitMessage(player.socket, 'config', retObj);
};

// Load a object
export const loadObject = async (req, res, next, id) => {
    try {
        const object = await Player.load(id);
        if (!object) {
            return rest.sendError(res, 'Unable to get player details', 'Player not found');
        }
        req.object = object;
        next();
    } catch (err) {
        return rest.sendError(res, 'Unable to get player details', err);
    }
};

// List of objects
export const index = async (req, res) => {
    try {
        const criteria = {};

        if (req.query['group']) {
            criteria['group._id'] = req.query['group'];
        }

        if (req.query['groupName']) {
            criteria['group.name'] = req.query['groupName'];
        }

        if (req.query['string']) {
            const str = new RegExp(req.query['string'], "i");
            criteria['name'] = str;
        }

        if (req.query['location']) {
            criteria['$or'] = [
                { 'location': req.query['location'] },
                { 'configLocation': req.query['location'] }
            ];
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

        const page = req.query.page > 0 ? Number(req.query.page) : 0;
        const perPage = req.query.per_page ? Number(req.query.per_page) : 500;
        
        const options = { perPage, page, criteria };  // ES6 shorthand

        const objects = await Player.list(options) || [];

        const data = {
            objects: objects,
            page: page,
            pages: Math.ceil(objects.length / perPage),
            count: objects.length
        };
        
        data.currentVersion = {
            version: pipkgjson.version,
            platform_version: pipkgjson.platform_version,
            beta: pipkgjsonBeta.version,
            versionP2: pipkgjson.versionP2
        };
        
        return rest.sendSuccess(res, 'sending Player list', data);
    } catch (err) {
        return rest.sendError(res, 'Unable to get Player list', err);
    }
};

export const getObject = (req, res) => {
    const object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Player details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Player details');
    }
};

export const createObject = async (req, res) => {
    try {
        let player;
        try {
            existingPlayer = await Player.findOne({ cpuSerialNumber: req.body.cpuSerialNumber });
          } catch (err) {
            console.log("Error while retriving player data: " + err);
          }

        if (existingPlayer) {
            delete req.body.__v; // Do not copy version key
            // Replace _.extend with Object.assign
            player = Object.assign(existingPlayer, req.body);
        } else {
            player = new Player(req.body);
            if (!player.group) player.group = defaultGroup;
        }
        
        player.registered = false;
        player.installation = installation;
        console.log(player);

        try {
            const group = await Group.findById(player.group._id);
            if (group) {
              sendConfig(player, group, true);
            } else {
              console.log("unable to find group for the player");
            }
          } catch (err) {
            console.log("unable to find group for the player");
            // continue saving anyway
          }

        const obj = await player.save();
        return rest.sendSuccess(res, 'new Player added successfully', obj);
    } catch (err) {
        return rest.sendError(res, 'Error in saving new Player', err || "");
    }
};

export const updateObject = async (req, res) => {
    try {
        let object = req.object;

        if (req.body.group && req.object.group._id != req.body.group._id) {
            req.body.registered = false;
        }
        delete req.body.__v; // Do not copy version key

        // Replace async.series with sequential await
        // Step 1: Handle player group
        const playerGroup = {
            name: "__player__" + object.cpuSerialNumber,
            installation: req.installation,
            _id: object.selfGroupId
        };

        if (!req.body.group || (req.body.group && req.body.group._id)) {
            // No action needed
        } else if (playerGroup._id) {
            req.body.group = playerGroup;
        } else {
            delete playerGroup._id;
            const groupData = await groups.newGroup(playerGroup);
            req.body.group = groupData.toObject();
            object.selfGroupId = groupData._id;
        }

        // Step 2: Update and save
        object = Object.assign(object, req.body);
        const data = await object.save();
        rest.sendSuccess(res, 'updated Player details', data);

        // Step 3: Send config
        const group = await Group.findById(object.group._id);
        if (group) {
            sendConfig(object, group, true);
        } else {
            console.log("unable to find group for the player");
        }
    } catch (err) {
        rest.sendError(res, 'Unable to update Player data', err);
    }
};

export const deleteObject = async (req, res) => {
    try {
        const object = req.object;
        await object.deleteOne();
        return rest.sendSuccess(res, 'Player record deleted successfully');
    } catch (err) {
        return rest.sendError(res, 'Unable to remove Player record', err);
    }
};

const updatePlayerCount = {};
const perDayCount = 20 * 24;

export const updatePlayerStatus = async (obj) => {
    try {
        updatePlayerCount[obj.cpuSerialNumber] = (updatePlayerCount[obj.cpuSerialNumber] || 0) + 1;
        if (updatePlayerCount[obj.cpuSerialNumber] > perDayCount) {
            updatePlayerCount[obj.cpuSerialNumber] = 0;
        }

        const data = await Player.findOne({ cpuSerialNumber: obj.cpuSerialNumber });
        let player;

        if (data) {
            if (!obj.lastUpload || (obj.lastUpload < data.lastUpload)) {
                delete obj.lastUpload;
            }
            if (!obj.name || obj.name.length === 0) {
                delete obj.name;
            }
            player = Object.assign(data, obj);
            if (!player.isConnected) {
                player.isConnected = true;
            }
        } else {
            player = new Player(obj);
            player.group = defaultGroup;
            player.installation = installation;
            player.isConnected = true;
        }

        // Server license feature
        if (player.serverServiceDisabled) {
            player.socket = null;
        }

        activePlayers[player._id.toString()] = true;

        if (!player.registered || obj.request) {
            const group = await Group.findById(player.group._id);
            if (group) {
                const now = Date.now();
                const pid = player._id.toString();
                
                // Throttle messages
                if (!lastCommunicationFromPlayers[pid] || 
                    (now - lastCommunicationFromPlayers[pid]) > 60000 || 
                    obj.priority) {
                    lastCommunicationFromPlayers[pid] = now;
                    sendConfig(player, group, (updatePlayerCount[obj.cpuSerialNumber] === 1));
                }
            } else {
                console.log("unable to find group for the player");
            }
        }

        await player.save();
    } catch (err) {
        console.log("Error while saving player status: " + err);
    }
};

export const secretAck = async (sid, status) => {
    try {
        const player = await Player.findOne({ socket: sid });
        if (player) {
            player.registered = status;
            await player.save();
        } else {
            console.log("not able to find player");
        }
    } catch (err) {
        console.error('Error in secretAck:', err);
    }
};

const pendingCommands = {};
const shellCmdTimer = {};

export const shell = (req, res) => {
    const cmd = req.body.cmd;
    const object = req.object;
    const sid = object.socket;
    
    pendingCommands[sid] = res;
    const socketio = object.webSocket ? webSocket : (object.newSocketIo ? newSocketio : oldSocketio);
    socketio.emitMessage(sid, 'shell', cmd);

    clearTimeout(shellCmdTimer[sid]);
    shellCmdTimer[sid] = setTimeout(() => {
        delete shellCmdTimer[sid];
        if (pendingCommands[sid]) {
            rest.sendSuccess(res, "Request Timeout", {
                err: "Could not get response from the player,Make sure player is online and try again."
            });
            pendingCommands[sid] = null;
        }
    }, 60000);
};

export const shellAck = (sid, response) => {
    if (pendingCommands[sid]) {
        clearTimeout(shellCmdTimer[sid]);
        delete shellCmdTimer[sid];
        rest.sendSuccess(pendingCommands[sid], 'Shell cmd response', response);
        pendingCommands[sid] = null;
    }
};

const pendingPlaylistChanges = {};
const playlistChangeTimers = {};

const pendingPlayerActions = {
    pause: {},
    forward: {},
    backward: {}
};

const playerActionTimers = {
    pause: {},
    forward: {},
    backward: {}
};

export const playlistMedia = (req, res) => {
    const object = req.object;
    const sid = object.socket;
    const action = req.params.action;

    const socketIO = object.newSocketIo ? newSocketio : oldSocketio;
    socketIO.emitMessage(sid, 'playlist_media', action);

    pendingPlayerActions[action][sid] = res;
    clearTimeout(playerActionTimers[action][sid]);

    playerActionTimers[action][sid] = setTimeout(() => {
        if (playerActionTimers[action][sid]) {
            delete playerActionTimers[action][sid];
            rest.sendSuccess(res, 'Request Timeout', {
                err: 'No response from the player, make sure the player is online and try again.'
            });
            pendingPlayerActions[action][sid] = null;
        }
    }, 60000);
};

export const setPlaylist = (req, res) => {
    const object = req.object;
    const playlist = req.params.playlist;
    const sid = object.socket;
    const socketIo = object.newSocketIo ? newSocketio : oldSocketio;
    
    socketIo.emitMessage(sid, 'setplaylist', playlist);

    pendingPlaylistChanges[sid] = res;
    clearTimeout(playlistChangeTimers[sid]);
    
    playlistChangeTimers[sid] = setTimeout(() => {
        delete playlistChangeTimers[sid];
        if (pendingPlaylistChanges[sid]) {
            const errMsg = 'Could not get response from the player for changing playlist, make sure player is online';
            rest.sendSuccess(res, 'Request Timeout', { err: errMsg });
            pendingPlaylistChanges[sid] = null;
        }
    }, 60000);
};

export const playlistMediaAck = (sid, response) => {
    const data = {};

    if (response.action && pendingPlayerActions[response.action][sid]) {
        clearTimeout(playerActionTimers[response.action][sid]);
        delete playerActionTimers[response.action][sid];
        data.action = response.action;
        
        if (response.action === 'pause') {
            data.isPaused = response.isPaused;
        }
        
        rest.sendSuccess(pendingPlayerActions[response.action][sid], response.msg, data);
        pendingPlayerActions[response.action][sid] = null;
    }
};

export const playlistChangeAck = (sid, response) => {
    if (pendingPlaylistChanges[sid]) {
        clearTimeout(playlistChangeTimers[sid]);
        delete playlistChangeTimers[sid];
        rest.sendSuccess(pendingPlaylistChanges[sid], 'Playlist change response', response);
        pendingPlaylistChanges[sid] = null;
    }
};

export const swupdate = (req, res) => {
    const object = req.object;
    let version = req.body.version || null;
    
    if (!version) {
        version = 'piimage' + pipkgjson.version + '.zip';
    }
    
    const socketio = object.webSocket ? webSocket : (object.newSocketIo ? newSocketio : oldSocketio);
    socketio.emitMessage(object.socket, 'swupdate', version, 'piimage' + pipkgjson.versionP2 + '-p2.zip');
    
    return rest.sendSuccess(res, 'SW update command issued');
};

export const upload = async (cpuId, filename, data) => {
    try {
        const player = await Player.findOne({ cpuSerialNumber: cpuId });
        
        if (player) {
            let logData;
            
            if (filename.indexOf('forever_out') === 0) {
                writeFile(config.logStoreDir + '/' + cpuId + '_forever_out.log', data, (err) => {
                    if (err) {
                        console.log("error", "Error in writing forever_out log for " + cpuId);
                        console.log(err);
                    }
                });
            } else if (path.extname(filename) === '.log' && filename.indexOf('forever_out.log') === -1) {
                try {
                    logData = JSON.parse(data);
                    logData.installation = player.installation;
                    logData.playerId = player._id.toString();
                } catch (e) {
                    console.log(player.cpuSerialNumber);
                    console.log("corrupt log file: " + filename);
                }
            } else if (path.extname(filename) === '.events') {
                const lines = data.split('\n');
                const events = [];
                
                for (let i = 0; i < lines.length; i++) {
                    try {
                        logData = JSON.parse(lines[i]);
                        if (logData.category === "file" || logData.description === "connected to server") {
                            continue;
                        }
                        logData.installation = player.installation;
                        logData.playerId = player._id.toString();
                        events.push(logData);
                    } catch (e) {
                        // Corrupt file, skip
                    }
                }
            }
            
            const socketio = player.webSocket ? webSocket : (player.newSocketIo ? newSocketio : oldSocketio);
            socketio.emitMessage(player.socket, 'upload_ack', filename);
        } else {
            console.log("ignoring file upload: " + filename);
        }
    } catch (err) {
        console.error('Error in upload:', err);
    }
};

export const tvPower = (req, res) => {
    const object = req.object;
    const cmd = req.body.cmd || "tvpower";
    let arg;
    
    if (cmd === "debuglevel") {
        arg = { level: req.body.level };
    } else if (cmd === "tvpower") {
        arg = { off: req.body.status };
    }

    const socketio = object.webSocket ? webSocket : (object.newSocketIo ? newSocketio : oldSocketio);
    socketio.emitMessage(object.socket, 'cmd', cmd, arg);
    
    return rest.sendSuccess(res, 'Player command issued');
};

const snapShotTimer = {};
const pendingSnapshots = {};

export const piScreenShot = (sid, data) => {
    const img = Buffer.from(data.data, "base64").toString("binary");
    const cpuId = data.playerInfo["cpuSerialNumber"];

    clearTimeout(snapShotTimer[cpuId]);
    delete snapShotTimer[cpuId];

    writeFile(path.join(config.thumbnailDir, cpuId + '.jpeg'), img, 'binary', (err) => {
        if (err) {
            console.log('error in saving screenshot for ' + cpuId, err);
        }
        if (pendingSnapshots[cpuId]) {
            rest.sendSuccess(pendingSnapshots[cpuId], 'screen shot received', {
                url: "/media/_thumbnails/" + cpuId + ".jpeg",
                lastTaken: Date.now()
            });
            delete pendingSnapshots[cpuId];
        }
    });
};

export const takeSnapshot = (req, res) => {
    const object = req.object;
    const cpuId = object.cpuSerialNumber;
    
    if (pendingSnapshots[cpuId]) {
        rest.sendError(res, 'snapshot taking in progress');
    } else if (!object.isConnected) {
        stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), (err, stats) => {
            rest.sendSuccess(res, 'player is offline, sending previous snapshot', {
                url: "/media/_thumbnails/" + cpuId + ".jpeg",
                lastTaken: stats ? stats.mtime : "NA"
            });
        });
    } else {
        pendingSnapshots[cpuId] = res;
        snapShotTimer[cpuId] = setTimeout(() => {
            delete snapShotTimer[cpuId];
            delete pendingSnapshots[cpuId];
            stat(path.join(config.thumbnailDir, cpuId + '.jpeg'), (err, stats) => {
                rest.sendSuccess(res, 'screen shot command timeout', {
                    url: "/media/_thumbnails/" + cpuId + ".jpeg",
                    lastTaken: stats ? stats.mtime : "NA"
                });
            });
        }, 60000);
        
        const socketio = object.webSocket ? webSocket : (object.newSocketIo ? newSocketio : oldSocketio);
        socketio.emitMessage(object.socket, 'snapshot');
    }
};
