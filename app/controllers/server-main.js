'use strict';

var mongoose = require('mongoose'),
    Group = mongoose.model('Group'),
    Player = mongoose.model('Player'),
    rest = require('../others/restware'),
    config = require('../../config/config'),
    fs = require('fs'),
    async = require('async'),
    path = require('path');

var socketio = require('./server-socket');

var playersToBeSynced = {}, players = {},  syncTime = {};

exports.getStatus = function (req, res) {
    return rest.sendSuccess(res, 'Dummy status', {server: true});
}

exports.getSettings = function () {
}

exports.saveSettings = function () {
}

exports.deploy = function (installation, group, cb) {
    async.series([
            function (async_cb) {
                Player.find({'group._id': group._id}, function (err, data) {
                    if (err) {
                        console.log("Unable to get Players list for deploy,", err);
                        async_cb(err);
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
                    mediaPath = path.join(config.mediaDir, installation);
                async.eachSeries(group.assets,
                    function (file, iterative_cb) {
                        fs.unlink(path.join(syncPath, file), function (err) {
                            fs.symlink(path.join(mediaPath, file), path.join(syncPath, file), function (err) {
                                //var utime = new Date();
                                //fs.utimes(syncPath+file,utime,utime, function(err){
                                if (err && (err.code != 'ENOENT')) {
                                    iterative_cb(err);
                                } else {
                                    iterative_cb();
                                }
                                //})
                            })
                        })
                    },
                    function (err, result) {
                        async_cb(err);
                    }
                )
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
                                        iterative_cb(err);
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

            }], function (err, results) {
            if (err) {
                console.log("Error in deploy: ", err);
                return cb(err, group);
            }
            players[group._id.toString()].forEach(function (player) {
                if (!player.version || player.version.charAt(0) == "0")
                    socketio.emitMessage(player.socket, 'sync', group.playlists[0].name || group.playlists[0], group.assets);
                else
                    socketio.emitMessage(player.socket, 'sync', group.playlists, group.assets);
                reports.createEvent(player, 'server', 'network', 'sync: ' + group.playlists[0].name + '/' + group.playlists.length + ' playlists', Date.now())
            });
            syncTime[group._id.toString()] = ~~(Date.now() / 1000);
            console.log("sending sync event to players");
            cb(null, group);
        }
    );
}
