"use strict" // REMOVE AFTER MIGRATING require TO import statements

const mongoose = require("mongoose"),
    Player = mongoose.model("Player"),
    Group = mongoose.model("Group"),
    groups = require("./groups"),
    _ = require("lodash"),
    path = require("path"),
    fs = require("fs");

const config = require("../../config/config.js"),
    sockets = require("./socket.js"),
    licenses = require("./licenses");

const restwareSendSuccess = require("../others/restware.js").sendSuccess;
const restwareSendError = require("../others/restware.js").sendError;

let installation,
    settings;

let pipkgjson = {},
    pipkgjsonBeta = {},
    pipkgjsonP2 = {};


const readVersions = function () {
    try {
        pipkgjson = JSON.parse(
            fs.readFileSync(
                path.join(config.releasesDir, "package.json"),
                "utf8"
            )
        );
    } catch (e) {
        pipkgjson = {};
    }
    try {
        pipkgjsonBeta = JSON.parse(
            fs.readFileSync(
                path.join(config.releasesDir, "package-beta.json"),
                "utf8"
            )
        );
    } catch (e) {
        pipkgjsonBeta = {};
    }
    try {
        pipkgjsonP2 = JSON.parse(
            fs.readFileSync(
                path.join(config.releasesDir, "package-p2.json"),
                "utf8"
            )
        );
        pipkgjson.versionP2 = pipkgjsonP2.version;
    } catch (e) {
        pipkgjsonP2 = {};
    }
}

readVersions();


/* CREATE LOG DIRECTORY ----------------------------------------------------------- */
const createDirectory = async (dirPath) => {
    try {
        await fs.promises.mkdir(dirPath);
    } catch (error) {
        if (error.code != "EEXIST") {
            console.log("Error creating logs directory ", error.code);
        }
    }
};

createDirectory(config.logStoreDir);


/* RESET isConnected FOR ALL PLAYERS ---------------------------------------------- */
const resetIsConnectedForAllPlayers = async () => {
    try {
        const updateManyPlayersResult = await Player.updateMany(
            { isConnected: true },
            { $set: { isConnected: false } },
            { multi: true }
        );

        console.log(`Reset isConnected for ${updateManyPlayersResult.nModified} players`)
    } catch (error) {
        console.error("Reset isConnected failed! - ", { error });
    }
};

resetIsConnectedForAllPlayers();

/* create a default group if does not exist --------------------------------------- */
let defaultGroup = { _id: 0, name: 'default' };

const getSettingsModelHandler = async (err, data) => {
    settings = data;
    installation = settings.installation || "local";

    try {
        await Group.updateOne(
            { name: "default" },
            { name: "default", description: "Default group for Players" },
            { upsert: true }
        );

        try {
            await fs.promises.mkdir(path.join(config.syncDir, installation));

            await fs.promises.mkdir(
                path.join(config.syncDir, installation, "default")
            );
        } catch (error) {
            if (error.code != "EEXIST") {
                console.error(
                    "failed to create default installation folders: ",
                    { error }
                );
            }
        }

        defaultGroup = await Group.findOne({ name: "default" });
    } catch (error) {
        console.error(
            "Failed to load settings and create default group for players: ",
            { error }
        );
    }
}

licenses.getSettingsModel(getSettingsModelHandler)


const activePlayers = {},
    lastCommunicationFromPlayers = {};

const checkPlayersWatchdog = async () => {
    const playerIds = Object.keys(activePlayers);

    try {
        for (const playerId of playerIds) {
            if (!activePlayers[playerId]) {
                const player = await Player.findById(playerId);
                if (player && player.isConnected) {
                    player.isConnected = false;
                    await player.save();
                    console.log(
                        `disconnect: ${player.installation} - ${player.name}; reason: checkPlayersWatchdog`
                    );
                }
                delete activePlayers[playerId];
            } else {
                activePlayers[playerId] = false;
            }
        }
    } catch (error) {
        console.error({ error });
        readVersions(); //update version of software
        setTimeout(checkPlayersWatchdog, 600000); //cleanup every 10 minutes
    }
};

/* HANDLE DISCONNECT EVENT ----------------------------------------------------------- */
exports.updateDisconnectEvent = async (socketId, reason) => {
    try {
        const player = await Player.findOne({ socket: socketId })    
        player.isConnected = false;
        await player.save();

        delete activePlayers[player._id.toString()];

        console.log(`disconnect: ${player.installation} - ${player.name}; reason: ${reason}`)

    } catch (error) {
        console.error(`Update disconnect error: ${error}`)
    }
    
}

/* CREATE AND SEND CONFIG OBJECT ------------------------------------------------------ */
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

    if (!player.version || player.version.charAt(0) == "0") {
        if (groupPlaylists[0] && groupPlaylists[0].name)
            retObj.currentPlaylist = groupPlaylists[0].name;
        else retObj.currentPlaylist = groupPlaylists[0];
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
    retObj.baseUrl = "/sync_folders/" + installation + "/";
    retObj.name = player.name;
    retObj.resolution = group.resolution || "720p";
    retObj.orientation = group.orientation || "landscape";
    retObj.enableMpv = group.enableMpv || false;
    retObj.mpvAudioDelay = group.mpvAudioDelay || "0";
    retObj.selectedVideoPlayer = group.selectedVideoPlayer || "default";
    retObj.kioskUi = group.kioskUi || { enable: false };
    retObj.animationType = group.animationType || "right";
    if (!player.version || parseInt(player.version.replace(/\D/g, "")) < 180)
        retObj.animationEnable = false;
    else retObj.animationEnable = group.animationEnable || false;
    retObj.resizeAssets = group.resizeAssets || false;
    retObj.videoKeepAspect = group.videoKeepAspect || false;
    retObj.videoShowSubtitles = group.videoShowSubtitles || false;
    retObj.imageLetterboxed = group.imageLetterboxed || false;
    retObj.brightness = group.brightness || {
        defaults: { control: "None", level: "Bright" },
        schedule: [],
    };
    retObj.sleep = group.sleep || {
        enable: false,
        ontime: null,
        offtime: null,
    };
    retObj.reboot = group.reboot || {
        enable: false,
        time: null,
        absoluteTime: null,
    };
    retObj.signageBackgroundColor = group.signageBackgroundColor || "#000";
    retObj.omxVolume =
        group.omxVolume || group.omxVolume == 0 ? group.omxVolume : 100;
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

    //if (!pipkgjson)
    //pipkgjson = JSON.parse(fs.readFileSync(path.join(config.releasesDir,'package.json'), 'utf8'))
    retObj.currentVersion = {
        version: pipkgjson.version,
        platform_version: pipkgjson.platform_version,
        beta: pipkgjsonBeta.version,
        versionP2: pipkgjson.versionP2,
    };
    // retObj.gcal = {
    //     id: config.gCalendar.CLIENT_ID,
    //     token: config.gCalendar.CLIENT_SECRET
    // }
    if (periodic) {
    }

    retObj.systemMessagesHide = settings.systemMessagesHide;
    retObj.forceTvOn = settings.forceTvOn;
    retObj.disableCECPowerCheck = settings.disableCECPowerCheck;
    retObj.hideWelcomeNotice = settings.hideWelcomeNotice;
    retObj.reportIntervalMinutes = settings.reportIntervalMinutes;
    retObj.authCredentials = settings.authCredentials;
    retObj.enableLog = settings.enableLog || false;
    retObj.enableYoutubeDl = true;

    if (settings.sshPassword) retObj.sshPassword = settings.sshPassword;
    retObj.currentTime = Date.now();

    sockets.emitMessage(
        player.webSocket
            ? sockets.WEB_SOCKET
            : player.newSocketIo
                ? sockets.NEW_SOCKET
                : sockets.OLD_SOCKET,
        player.socket,
        "config",
        retObj
    );
}

/* LOAD AN OBJECT MIDDLEWARE ------------------------------------------------------------ */
exports.loadObject = async (req, res, next, id) => {

    try {
        const playerToLoad = await Player.load(id)

        if (!playerToLoad) return restwareSendError(res, 'Unable to get group details');

        req.object = playerToLoad

        next()
    } catch (error) {
        return restwareSendError(res, 'Unable to get group details', error);
    }
}

/* GET LIST OF PLAYERS ------------------------------------------------------------------ */
exports.index = async (req, res) => {

    const criteria = {};


    if (req.query['group']) {
        criteria['group._id'] = req.query['group'];
    }

    if (req.query['groupName']) {
        criteria['group.name'] = req.query['groupName'];
    }

    if (req.query['string']) {
        const str = new RegExp(req.query['string'], "i")
        criteria['name'] = str;
    }


    if (req.query['location']) {
        criteria['$or'] = [{ 'location': req.query['location'] }, { 'configLocation': req.query['location'] }];
    }    // save screen shot in  _screenshots directory

    if (req.query['label']) {
        criteria['labels'] = req.query['label'];
    }

    if (req.query['currentPlaylist']) {
        criteria['currentPlaylist'] = req.query['currentPlaylist'];
    }

    if (req.query['version']) {
        criteria['version'] = req.query['version'];
    }

    const page = req.query['page'] > 0 ? req.query['page'] : 0
    const perPage = req.query['per_page'] || 500

    const options = {
        perPage,
        page,
        criteria
    }

    
    try {
        let objects = await Player.list(options);

        objects = objects || [];

        const data = {
            objects,
            page,
            pages: Math.ceil(objects.length / perPage),
            count: objects.length,
        };
        data.currentVersion = {
            version: pipkgjson.version,
            platform_version: pipkgjson.platform_version,
            beta: pipkgjsonBeta.version,
            versionP2: pipkgjson.versionP2,
        };
        return restwareSendSuccess(res, "sending Player list", data);
    } catch (error) {
        return restwareSendError(res, "Unable to get Player list", error);
    }

}

/* GET PLAYER OBJECT BY ID ---------------------------------------------------------- */
exports.getObject = (req, res) => {
    try {
        const object = req.object;
        return restwareSendSuccess(res, "Player details", object);
    } catch (error) {
        return restwareSendError(res, "Unable to retrieve Player details", {
            error,
        });
    }
};

/* CREATE PLAYER -------------------------------------------------------------------- */
exports.createObject = async (req, res) => {
    let player;

    try {
        const isExistingPlayer = await Player.findOne({
            cpuSerialNumber: req.body.cpuSerialNumber,
        });

        if (isExistingPlayer) {
            delete req.body.__v; //do not copy version key
            player = _.extend(isExistingPlayer, req.body);
        } else {
            player = new Player(req.body);
            if (!player.group) player.group = defaultGroup;
        }

        player.registered = false;
        player.installation = installation;
    } catch (error) {
        console.error("Error while retrieving player data: ", { error });
    }

    try {
        const playerGroup = await Group.findById(player.group._id);
        sendConfig(player, playerGroup, true);
    } catch (error) {
        console.log("unable to find group for the player");
    }

    try {
        const savedPlayer = await player.save();
        return restwareSendSuccess(res, "new Player added successfully", savedPlayer);
    } catch (error) {
        return restwareSendError(
            res,
            "Error in saving new Player",
            error || ""
        );
    }

}

/* SUPPORTING FUNCTION FOR UPDATE OBJECT FUNCTION ---------------------------------- */
const updateObjectObjectSaveHandler = async (object, req, res) => {
    object = _.extend(object, req.body);

    try {
        const objectSaveData = await object.save()
        restwareSendSuccess(res, "updated Player details", objectSaveData)
        return object
    } catch (error) {
        restwareSendError(res, "Unable to update Player data", { error });
        return 
    }

};

/* UPDATE PLAYER HANDLER ----------------------------------------------------------- */
exports.updateObject = async (req, res) => {
    let object = req.object;

    if (req.body.group && req.object.group._id != req.body.group._id) {
        req.body.registered = false;
    }

    delete req.body.__v; //do not copy version key

    try {
        const playerGroup = {
            name: `__player__${object.cpuSerialNumber}`,
            installation: req.installation,
            _id: object.selfGroupId,
        };

        if (!req.body.group || (req.body.group && req.body.group._id)) {
            object = await updateObjectObjectSaveHandler(object, req, res);
        } else if (playerGroup._id) {
            req.body.group = playerGroup;
            object = await updateObjectObjectSaveHandler(object, req, res);
        } else {
            delete playerGroup._id;

            try {
                const newGroupData = groups.newGroup(playerGroup);

                req.body.group = newGroupData.toObject();
                object.selfGroupId = newGroupData._id;
            } catch (error) {
                console.error({ error });
            }
        }
    } catch (error) {
        console.error("error updating object: ", { error });
    }

    try {
        const groupData = await Group.findById(object.group._id);
        sendConfig(object, groupData, true);
    } catch (error) {
        console.error("Unable to find group for the player", { error });
    }

    return 

};

/* DELETE PLAYER ---------------------------------------------------------------------- */
exports.deleteObject = async (req, res) => {

    const object = req.object;

    try {
        await object.remove();
        return restwareSendSuccess(res, "Player record deleted successfully");
    } catch (error) {
        return restwareSendError(res, "Unable to remove Player record", {
            error,
        });
    }

}

/* UPDATE PLAYER STATUS -------------------------------------------------------------- */
const updatePlayerCount = {};    // save screen shot in  _screenshots directory
const perDayCount = 20 * 24;

exports.updatePlayerStatus = async (obj) => {

    updatePlayerCount[obj.cpuSerialNumber] =
        (updatePlayerCount[obj.cpuSerialNumber] || 0) + 1;
    if (updatePlayerCount[obj.cpuSerialNumber] > perDayCount) {
        updatePlayerCount[obj.cpuSerialNumber] = 0;
    }

    try {
        const playerData = await Player.findOne({
            cpuSerialNumber: obj.cpuSerialNumber,
        });

        let player;

        if (playerData) {
            if (!obj.lastUpload || obj.lastUpload < playerData.lastUpload)
                delete obj.lastUpload;

            if (!obj.name || obj.name.length == 0) delete obj.name;

            player = _.extend(playerData, obj);
            if (!player.isConnected) {
                player.isConnected = true;
            }
        } else {
            player = new Player(obj);
            player.group = defaultGroup;
            player.installation = installation;
            player.isConnected = true;
        }

        if (player.serverServiceDisabled) player.socket = null;

        activePlayers[player._id.toString()] = true;    // save screen shot in  _screenshots directory

        if (!player.registered || obj.request) {
            try {
                const groupData = await Group.findById(player.group._id);

                const now = Date.now();
                const pid = player._id.toString();
                //throttle messages
                if (
                    !lastCommunicationFromPlayers[pid] ||
                    now - lastCommunicationFromPlayers[pid] > 60000 ||
                    obj.priority
                ) {
                    lastCommunicationFromPlayers[pid] = now;
                    sendConfig(
                        player,
                        groupData,
                        updatePlayerCount[obj.cpuSerialNumber] === 1
                    );
                } 
                
                // else {
                    //console.log("communication to "+player.name+" at "+now+", last "+ lastCommunicationFromPlayers[pid]+" did not happen")
                // }
            } catch (error) {
                console.error("unable to find group for the player");
            }
        }

        try {
            await player.save();
        } catch (error) {
            console.error(`Error while saving player status: ${error}`);
            return;
        }
    } catch (error) {
        console.log(`Error while retrieving player data: ${error}`);
    }    // save screen shot in  _screenshots directory

};

exports.secretAck = async (sid, status) => {
    try {
        const player = await Player.findOne({ socket: sid })

        if (player) {
            player.registered = status
            player.save()

        }

    } catch (error) {
        console.log("not able to find player")
        console.error(error)
    }

}

/* PLAYER SHELL HANDLER ------------------------------------------------------ */
const pendingCommands = {};
const shellCmdTimer = {};

exports.shell = (req, res) => {
    const cmd = req.body.cmd;
    const object = req.object;
    const sid = object.socket;
    pendingCommands[sid] = res;

    sockets.emitMessage(
        object.webSocket
            ? sockets.WEB_SOCKET
            : object.newSocketIo
            ? sockets.NEW_SOCKET
            : sockets.OLD_SOCKET,
        sid,
        "shell",
        cmd
    );

    clearTimeout(shellCmdTimer[sid]);
    shellCmdTimer[sid] = setTimeout(function () {
        delete shellCmdTimer[sid];
        if (pendingCommands[sid]) {
            restwareSendSuccess(res, "Request Timeout", {
                err: "Could not get response from the player! Make sure player is online and try again.",
            });
            pendingCommands[sid] = null;
        }
    }, 60000);
};

exports.shellAck = (sid, response) => {

    if (pendingCommands[sid]) {

        clearTimeout(shellCmdTimer[sid])
        delete shellCmdTimer[sid];

        restwareSendSuccess(pendingCommands[sid], 'Shell cmd response', response);
        pendingCommands[sid] = null;
    }

}

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

exports.playlistMedia = (req, res) => {

    const object = req.object,
        sid = object.socket;
    const action = req.params.action;

    sockets.emitMessage(
        object.webSocket
            ? sockets.WEB_SOCKET
            : object.newSocketIo
            ? sockets.NEW_SOCKET
            : sockets.OLD_SOCKET,
        sid,
        "playlist_media",
        action
    );

    pendingPlayerActions[action][sid] = res;

    clearTimeout(playerActionTimers[action][sid]);

    playerActionTimers[action][sid] = setTimeout(() => {
        if (playerActionTimers[action][sid]) {
            delete playerActionTimers[action][sid];

            restwareSendSuccess(res, "Request Timeout", {
                err: "No response from the player, make sure the player is online and try again.",
            });

            pendingPlayerActions[action][sid] = null;
        }
    }, 60000);
};

/* PLAYER PLAYLIST SETTER ------------------------------------------------------------ */
exports.setPlaylist = (req, res) => {
    const object = req.object;
    const playlist = req.params.playlist;
    const sid = object.socket;

    sockets.emitMessage(
        object.webSocket
            ? sockets.WEB_SOCKET
            : object.newSocketIo
            ? sockets.NEW_SOCKET
            : sockets.OLD_SOCKET,
        sid,
        "setplaylist",
        playlist
    );

    pendingPlaylistChanges[sid] = res;

    clearTimeout(playlistChangeTimers[sid]);

    playlistChangeTimers[sid] = setTimeout(() => {
        delete playlistChangeTimers[sid];
        if (pendingPlaylistChanges[sid]) {
            const errMsg =
                "Could not get response from the player for changing playlist, make sure player is online";

            restwareSendSuccess(res, "Request Timeout", { err: errMsg });

            pendingPlaylistChanges[sid] = null;
        }
    }, 60000);
};

exports.playlistMediaAck = (sid, response) => {
    const data = {};

    if (response.action && pendingPlayerActions[response.action][sid]) {
        clearTimeout(playerActionTimers[response.action][sid]);

        delete playerActionTimers[response.action][sid];

        data.action = response.action;

        if (response.action === "pause") {
            data.isPaused = response.isPaused;
        }

        restwareSendSuccess(
            pendingPlayerActions[response.action][sid],
            response.msg,
            data
        );

        pendingPlayerActions[response.action][sid] = null;
    }
};

exports.playlistChangeAck = (sid, response) => {
    if (pendingPlaylistChanges[sid]) {
        clearTimeout(playlistChangeTimers[sid]);

        delete playlistChangeTimers[sid];

        restwareSendSuccess(
            pendingPlaylistChanges[sid],
            "Playlist change response",
            response
        );

        pendingPlaylistChanges[sid] = null;
    }
};

exports.swupdate = (req, res) => {
    const object = req.object
    const version = req.body.version || null;

    if (!version) {
        version = `piimage${pipkgjson.versionP2}-p2.zip`
    }

    sockets.emitMessage(
        object.webSocket
            ? sockets.WEB_SOCKET
            : object.newSocketIo
                ? sockets.NEW_SOCKET
                : sockets.OLD_SOCKET,
        object.socket,
        'swupdate',
        version,
        `piimage${pipkgjson.versionP2}-p2.zip`

    );

    return restwareSendSuccess(res, 'SW update command issued');
}


exports.upload = async (cpuId, filename, data) => {

    try {
        const playerDetails = await Player.findOne({ cpuSerialNumber: cpuId });

        if (playerDetails) {
            let logData;

            if (filename.indexOf("forever_out") === 0) {
                try {
                    await fs.promises.writeFile(
                        `${config.logStoreDir}/${cpuId}_forever_out.log`,
                        data
                    );
                } catch (error) {
                    console.log(
                        "error",
                        `Error in writing forever_out log for ${cpuId}`
                    );
                    console.error(error);
                }
            } else if (
                path.extname(filename) === ".log" &&
                filename.indexOf("forever_out.log") === -1
            ) {
                try {
                    
                    logData = JSON.parse(data);
                    logData.installation = playerDetails.installation;
                    logData.playerId = playerDetails._id.toString();
                } catch (e) {
                    //corrupt file
                    console.log(`corrupt log file: ${filename}`);
                    console.error(e)

                }
            } else if (path.extname(filename) === ".events") {
                const lines = data.split("\n");
                const events = [];

                for (const line of lines) {
                    try {
                        if (line !== "" && line !== " ") {
                            logData = JSON.parse(line);

                            if (logData.category == "file" || logData.description == "connected to server") continue;

                            logData.installation = playerDetails.installation;
                            logData.playerId = playerDetails._id.toString();

                            events.push(logData);
                        }

                    } catch (error) {
                        console.error(error);
                    }
                }
            }

            sockets.emitMessage(
                playerDetails.webSocket
                    ? sockets.WEB_SOCKET
                    : playerDetails.newSocketIo
                        ? sockets.NEW_SOCKET
                        : sockets.OLD_SOCKET,
                playerDetails.socket,
                "upload_ack",
                filename
            );
        } else {
            console.log(`ignoring file upload: ${filename}`);
        }
    } catch (error) {
        console.error(error);
    }

};

/* PLAYER ON/OFF -------------------------------------------------------------- */
exports.tvPower = (req, res) => {
    const object = req.object

    const cmd = req.body.cmd || "tvpower"

    let arg;
    
    if (cmd == "debuglevel") {
        arg = { level: req.body.level }
    } else if (cmd == "tvpower") {
        arg = { off: req.body.status }
    }

    sockets.emitMessage(
        object.webSocket
            ? sockets.WEB_SOCKET
            : object.newSocketIo
                ? sockets.NEW_SOCKET
                : sockets.OLD_SOCKET,
        object.socket,
        "cmd",
        cmd,
        arg
    );

    return restwareSendSuccess(res, 'Player command issued');
}

/* PLAYER SCREEN SHOT HANDLERS ----------------------------------------------- */
const snapShotTimer = {};
const pendingSnapshots = {};

exports.piScreenShot = async (sid, data) => {

    // save screen shot in  _screenshots directory
    const img = Buffer.from(data.data, "base64").toString("binary");
    const cpuId = data.playerInfo["cpuSerialNumber"];

    clearTimeout(snapShotTimer[cpuId]);
    delete snapShotTimer[cpuId];

    try {
        await fs.promises.writeFile(
            path.join(config.thumbnailDir, `${cpuId}.jpeg`),
            img,
            "binary"
        );

        if (pendingSnapshots[cpuId]) {
            restwareSendSuccess(
                pendingSnapshots[cpuId],
                "screen shot received",
                {
                    url: `/media/_thumbnails/${cpuId}.jpeg`,
                    lastTaken: Date.now(),
                }
            );
            delete pendingSnapshots[cpuId];
        }
    } catch (error) {
        console.error(`error in saving screenshot for ${cpuId}: `, error);
    }

};

exports.takeSnapshot = async (req, res) => {

    const object = req.object;
    const cpuId = object.cpuSerialNumber;

    if (pendingSnapshots[cpuId])
        restwareSendError(res, "snapshot taking in progress");
    else if (!object.isConnected) {
        try {
            const stats = await fs.promises.stat(
                path.join(config.thumbnailDir, `${cpuId}.jpeg`)
            );
            restwareSendSuccess(
                res,
                "player is offline, sending previous snapshot",
                {
                    url: `/media/_thumbnails/${cpuId}.jpeg`,
                    lastTaken: stats ? stats.mtime : "NA",
                }
            )
        } catch (error) {
            console.error(error);
        }

    } else {
        pendingSnapshots[cpuId] = res;
        snapShotTimer[cpuId] = setTimeout(async () => {
            delete snapShotTimer[cpuId];
            delete pendingSnapshots[cpuId];

            try {
                const stats = await fs.stat(
                    path.join(config.thumbnailDir, `${cpuId}.jpeg`)
                );

                restwareSendSuccess(res, "screen shot command timeout", {
                    url: `/media/_thumbnails/${cpuId}.jpeg`,
                    lastTaken: stats ? stats.mtime : "NA",
                });
            } catch (error) {
                console.error(error);
            }
        }, 60000);

        sockets.emitMessage(
            object.webSocket
                ? sockets.WEB_SOCKET
                : object.newSocketIo
                    ? sockets.NEW_SOCKET
                    : sockets.OLD_SOCKET,
            object.socket,
            "snapshot"
        );
    }
};


