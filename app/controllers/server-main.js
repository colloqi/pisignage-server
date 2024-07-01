"use strict" // REMOVE AFTER MIGRATING require TO import statements

const mongoose = require('mongoose'),
    Player = mongoose.model('Player'),
    Asset = mongoose.model('Asset'),
    config = require('../../config/config'),
    fs = require('fs'),
    path = require('path');

const { pipeline } = require('stream/promises');

const playersToBeSynced = {}, players = {};

const logger = require("../others/logger.js");
const sockets = require("./socket.js");

// exports.getStatus = (req, res) => {
//     return rest.sendSuccess(res, 'Dummy status', {server: true});
// }

// exports.getSettings = function () {
// }

// exports.saveSettings = function () {
// }

exports.deploy = async (installation, group, cb) => {

    // OPERATION 0 ================================================================================
    if (!group.playlists || group.playlists.length == 0) {
        group.deployedAssets = group.assets;
        group.deployedPlaylists = group.playlists;
        group.deployedTicker = group.ticker;

        console.log("Error in deploy: No Playlists assigned to the Group");
        return cb("Error in deploy: No Playlists assigned to the Group", group);
    }

    // OPERATION 1 ================================================================================
    try {
        const playersInGroup = await Player.find({ "group._id": group._id });

        if (!playersInGroup || playersInGroup.length === 0) {
            console.log("Unable to get Players list for deploy,");

            group.deployedAssets = group.assets;
            group.deployedPlaylists = group.playlists;
            group.deployedTicker = group.ticker;

            console.log("No Players associated");
            return cb("No Players associated, ", group);
        }

        for (const player of playersInGroup) {
            playersToBeSynced[player.cpuSerialNumber] = player;
        }
        players[group._id.toString()] = playersInGroup;

    } catch (error) {
        console.log(`Unable to get Players list for deploy, ${error}`);

        group.deployedAssets = group.assets;
        group.deployedPlaylists = group.playlists;
        group.deployedTicker = group.ticker;

        console.log("Error in deploy: No Players associated");
        return cb("No Players associated, ", group);
    }

    // FOLDER SETUP ================================================================================
    const syncPath = path.join(config.syncDir, installation, group.name);
    const mediaPath = path.join(config.mediaDir);

    // OPERATION 2 ================================================================================
    if (!fs.existsSync(syncPath)) {
        await fs.promises.mkdir(syncPath);
    }

    const filesNotPresent = [];

    for (const file of group.assets) {
        // if (!file) continue;

        const srcFile = path.join(mediaPath, file);
        const dstFile = path.join(syncPath, file);

        if (fs.existsSync(dstFile)) await fs.promises.unlink(dstFile);

        try {
            const fileStats = await fs.promises.stat(srcFile);

            if (!fileStats.isFile()) {
                if (file.indexOf("TV_OFF") == -1) {
                    filesNotPresent.push(file);
                }

                continue;
            } else {
                try {
                    // COPYING PIPELINE
                    await pipeline(
                        fs.createReadStream(srcFile),
                        fs.createWriteStream(dstFile)
                    );

                } catch (error) {
                    console.error(
                        "Media folder to Sync folder pipeline error",
                        { error }
                    );
                    const errorMessage = `Unable to copy playlist ${file} for ${installation}`;
                    logger.error(errorMessage);

                    for (const file of filesNotPresent) {
                        group.assets.splice(group.assets.indexOf(file), 1);
                    }

                    group.deployedAssets = group.assets;
                    group.deployedPlaylists = group.playlists;
                    group.deployedTicker = group.ticker;

                    console.error(`Error in deploy: ${errorMessage}`);
                    return cb(err, group);
                }

                /*
                    const copy = await new Promise((resolve, reject) => {
                        let done = false;

                        const srcFileReadStream = fs.createReadStream(srcFile);
                        const dstFileWriteStream =
                            fs.createWriteStream(dstFile);
                        srcFileReadStream.pipe(dstFileWriteStream);

                        srcFileReadStream.on("error", (error) => {
                            if (!done) {
                                done = true;
                                
                                const errMessage = `Unable to copy playlist ${file} for ${installation}`
                                logger.error(errMessage);


                                reject(error);

                            }
                        })

                        dstFileWriteStream.on("error", (error) => {
                            if (!done) {
                                done = true;

                                const errMessage = `Unable to copy playlist ${file} for ${installation}`
                                logger.error(errMessage);

                                reject(error);
                            }
                        });
                        dstFileWriteStream.on("close", () => {
                            if (!done) {
                                done = true;
                                resolve(null);
                            }
                        });
                    });
                    */

            }
        } catch (error) {
            if (file.indexOf("TV_OFF") == -1) {
                filesNotPresent.push(file);
            }

            continue;
        }
    }

    // OPERATION 3 ================================================================================
    try {
        const dirData = await fs.promises.readdir(syncPath);
        const files = dirData.filter((file) => file.charAt(0) != ".");

        for (const file of files) {
            if (group.assets.indexOf(file) == -1)
                await fs.promises.unlink(path.join(syncPath, file));
        }
    } catch (error) {
        group.deployedAssets = group.assets;
        group.deployedPlaylists = group.playlists;
        group.deployedTicker = group.ticker;

        console.error(`Error in deploy: ${error}`);
        return cb(error, group);
    }


    // OPERATION 4 ================================================================================
    const specialFiles = [
        "brand_intro.mp4",
        "brand_intro_portrait.mp4",
        "welcome.ejs",
        "iot.zip",
    ];

    const filesAdded = [];

    for (const file of specialFiles) {
        const fileToSync = path.join(
            config.syncDir,
            installation,
            group.name,
            file
        );
        const fileInMedia = path.join(config.mediaDir, file);

        if (fs.existsSync(fileToSync)) await fs.promises.unlink(fileToSync);

        try {
            const fileInMediaStats = await fs.promises.stat(fileInMedia);

            if (!fileInMediaStats.isFile()) continue;

            try {
                await fs.promises.symlink(fileInMedia, fileToSync);
                filesAdded.push(file);
            } catch (error) {
                if (error && error.code != "ENOENT") {
                    console.error(`Error in creating symlink to ${file}`);
                }
            }
        } catch (error) {
            continue;
        }
    }


    // OPERATION 5 ================================================================================
    try {
        const assetData = await Asset.find(
            { "validity.enable": true, name: { $in: group.assets } },
            "name validity"
        );

        if (assetData) {
            group.assetsValidity = assetData.map((asset) => {
                return {
                    name: asset.name,
                    startdate: asset.validity.startdate,
                    enddate: asset.validity.enddate,
                    starthour: asset.validity.starthour,
                    endhour: asset.validity.endhour,
                };
            });
        }
    
    } catch (error) {
        console.error("Asset Validity error: ", { error });
        group.assetsValidity = [];
        logger.error(
            `Asset validity query error for ${installation}; ${error}`
        );
    }

    // WRAP-UP ===================================================================================
    group.deployedAssets = group.assets;
    group.deployedPlaylists = group.playlists;
    group.deployedTicker = group.ticker;

    for (const player of players[group._id.toString()]) {

        const emitMessageArgs = [
            "sync",
            group.playlists,
            group.assets,
            group.deployedTicker,
            group.logo,
            group.logox,
            group.logoy,
            group.combineDefaultPlaylist,
            group.omxVolume,
            group.loadPlaylistOnCompletion,
            group.assetsValidity,
        ];

        sockets.emitMessage(
            player.webSocket
                ? sockets.WEB_SOCKET
                : player.newSocketIo
                ? sockets.NEW_SOCKET
                : sockets.OLD_SOCKET,
            player.socket,
            ...emitMessageArgs
        );
    }

    console.log("Sending sync event to players");
    cb(null, group);
};
