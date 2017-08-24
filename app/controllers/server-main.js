'use strict';

var mongoose = require('mongoose'),
    Player = mongoose.model('Player'),
    Asset = mongoose.model('Asset'),
    rest = require('../others/restware'),
    config = require('../../config/config'),
    fs = require('fs'),
    async = require('async'),
    path = require('path');

var socketio = require('./server-socket');

var playersToBeSynced = {}, players = {};

exports.getStatus = function (req, res) {
    return rest.sendSuccess(res, 'Dummy status', {server: true});
}

exports.getSettings = function () {
}

exports.saveSettings = function () {
}

exports.deploy = function (installation,group, cb) {
    async.series([
        function (async_cb) {

            if (!group.playlists  || group.playlists.length == 0)
                return async_cb("No Playlists assigned to the Group")

            Player.find({'group._id': group._id}, function (err, data) {
                if (err || !data || data.length == 0) {
                    console.log("Unable to get Players list for deploy,", err);
                    async_cb("No Players associated, "+(err?err:""));
                } else {
                    data.forEach(function (player) {
                        playersToBeSynced[player.cpuSerialNumber] = player;
                    });
                    players[group._id.toString()] = data;
                    async_cb()
                }
            })
        },
        function (async_cb) {
            var syncPath = path.join(config.syncDir, installation, group.name),
                mediaPath = path.join(config.mediaDir);
            fs.mkdir(syncPath, function (err) {
                console.log("created directory: "+syncPath+","+err)
                var filesNotPresent = []
                async.eachSeries(group.assets,
                    function (file, iterative_cb) {
                        var srcfile = path.join(mediaPath,file),
                            dstfile = path.join(syncPath,file);
                        fs.unlink(dstfile, function (err) {
                            fs.stat(srcfile, function (err, stats) {
                                if (err || !stats.isFile()) {
                                    if (file.indexOf("TV_OFF") == -1) {
                                        //console.log("removing file as it is not present: " + file)
                                        //group.assets.splice(group.assets.indexOf(file), 1)       //careful, async gets affected if the array is same
                                        filesNotPresent.push(file)
                                    }
                                    iterative_cb();
                                } else {
                                    //console.log("file is present; " + file)
                                    fs.symlink(srcfile, dstfile, function (err) {
                                        if (err && (err.code != 'ENOENT')) {
                                            iterative_cb();
                                        } else {
                                            iterative_cb();
                                        }
                                    })
                                }
                            })
                        })
                    },
                    function (err, result) {
                        filesNotPresent.forEach(function(file){
                            group.assets.splice(group.assets.indexOf(file), 1)
                        })
                        async_cb(err);
                    }
                )
            });
        },
        function (async_cb) {
            var syncPath = path.join(config.syncDir, installation, group.name);
            fs.readdir(syncPath, function (err, data) {
                if (err)
                    async_cb(err)
                else {
                    var files = data.filter(function (file) {
                        return (file.charAt(0) != '.');
                    })
                    async.eachSeries(files,
                        function (file, iterative_cb) {
                            if (group.assets.indexOf(file) == -1) {
                                fs.unlink(path.join(syncPath, file), function (err) {
                                    iterative_cb();
                                })
                            } else {
                                iterative_cb();
                            }
                        },
                        function (err, result) {
                            async_cb(err);
                        }
                    )
                }
            })
        },
        function(async_cb){ // brand video check
            var specialFiles = ["brand_intro.mp4","brand_intro_portrait.mp4","welcome.ejs","iot.zip"]
            var filesAdded = []
            async.eachSeries(specialFiles,
                function(file,iterative_cb){
                    var syncPath = path.join(config.syncDir,installation,group.name,file),
                        mediaPath = path.join(config.mediaDir,file);
                    fs.unlink(syncPath,function(err){
                        fs.stat(mediaPath, function (err, stats) {
                            if (err || !stats.isFile())
                                iterative_cb();
                            else {
                                fs.symlink(mediaPath, syncPath, function (err) {
                                    if (err && (err.code != 'ENOENT')) {
                                        console.log('error in creating symlink to ' + file);
                                    }
                                    filesAdded.push(file)
                                    iterative_cb();
                                })
                            }
                        })
                    })
                },
                function(err,result){
                    group.assets = group.assets.concat(filesAdded)
                    async_cb(err);
                }
            )
        },function(async_cb){ // send list of asset validity
            Asset.find({'validity.enable':true,'name':{'$in':group.assets}},
                "name validity",function (err, data) {
                    if (!err && data) {
                        group.assetsValidity = data.map(function(asset){
                            return ({name:asset.name, startdate:asset.validity.startdate, enddate:asset.validity.enddate})
                        })
                        //console.log(group.assetsValidity)
                    } else {
                        group.assetsValidity = [];
                        logger.log("error", "Asset validity query error for " + installation + ";" + err)
                    }
                    async_cb();
                })
        }], function (err, results) {
            group.deployedAssets = group.assets
            if (err) {
                console.log("Error in deploy: ", err);
                return cb(err, group);
            }
            players[group._id.toString()].forEach(function (player) {
                socketio.emitMessage(player.socket, 'sync',
                    group.playlists, group.assets, group.deployedTicker,
                    group.logo, group.logox, group.logoy,group.combineDefaultPlaylist,group.omxVolume,
                    group.loadPlaylistOnCompletion, group.assetsValidity);
            });
            console.log("sending sync event to players");
            cb(null, group);
        }
    );
}
