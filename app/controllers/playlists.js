'use strict';

var config = require('../../config/config'),
    rest = require('../others/restware'),
    fs = require('fs'),
    path = require('path'),
    async = require('async');


var isPlaylist = function (file) {
    return (file.charAt(0) == '_' && file.charAt(1) == '_');
}

exports.newPlaylist = function (installation, playlist, cb) {
    var file = path.join(config.mediaDir, installation, ("__" + playlist + '.json'));

    fs.writeFile(file, '', function (err) {
        cb(err);
    })
}

exports.index = function (req, res) {

    var assetDir = path.join(config.mediaDir, req.installation);

    fs.readdir(assetDir, function (err, files) {
        if (err) {
            return rest.sendError(res, 'directory read error', err);
        } else {
            var playlists = files.filter(isPlaylist),
                list = [];

            var readFile = function (plfile, cb) {
                var playlist = {
                    settings: {},
                    assets: [],
                    name: path.basename(plfile, '.json').slice(2)
                }
                fs.readFile(path.join(assetDir, plfile), 'utf8', function (err, data) {
                    if (err || !data)
                        list.push(playlist);
                    else {
                        var obj = {};
                        try {
                            obj = JSON.parse(data);
                        } catch (e) {
                            console.log("playlist index parsing error for " + req.installation)
                        }
                        playlist.settings = obj.settings || {};
                        playlist.assets = obj.assets || [];
                        list.push(playlist);
                    }
                    cb();
                })
            }

            async.each(playlists, readFile, function (err) {
                if (err) {
                    return rest.sendError(res, 'playlist read error', err);
                } else {
                    return rest.sendSuccess(res, ' Sending playlist list', list);
                }
            })

        }
    });

}

exports.getPlaylist = function (req, res) {

    var file = path.join(config.mediaDir, req.installation, ("__" + req.params['file'] + '.json'));

    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            return rest.sendError(res, 'playlist file read error', err);
        } else {
            var playlist = {
                settings: {},
                layout: '1',
                assets: []
            }
            if (data) {
                var obj = {};
                try {
                    obj = JSON.parse(data);
                } catch (e) {
                    console.log("getPlaylist parsing error for " + req.installation)
                }
                playlist.settings = obj.settings || {};
                playlist.assets = obj.assets || [];
                playlist.layout = obj.layout || '1';
            }

            return rest.sendSuccess(res, ' Sending playlist content', playlist);
        }
    });
}

exports.createPlaylist = function (req, res) {

    exports.newPlaylist(req.installation, req.body['file'], function (err) {
        if (err) {
            rest.sendError(res, "Playlist write error", err);
        } else {
            rest.sendSuccess(res, "Playlist Created: ", req.body['file']);
        }
    });
}

exports.savePlaylist = function (req, res) {

    var file = path.join(config.mediaDir, req.installation, ("__" + req.params['file'] + '.json'));

    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            rest.sendError(res, "Playlist file read error", err)
        } else {
            var fileData = {}, dirty = false;
            fileData.version = 0;
            fileData.layout = "1";

            if (data) {
                try {
                    fileData = JSON.parse(data);
                } catch (e) {
                    console.log("savePlaylist parsing error for " + req.installation)
                }
                fileData.version = fileData.version || 0;
            }
            if (req.body.settings) {
                fileData.settings = req.body.settings;
                dirty = true;
            }

            if (req.body.assets) {
                fileData.assets = req.body.assets;
                dirty = true;
            }
            if (req.body.layout) {
                fileData.layout = req.body.layout;
                dirty = true;
            }

            if (dirty) {
                fileData.version += 1;
                fs.writeFile(file, JSON.stringify(fileData, null, 4), function (err) {
                    if (err) {
                        rest.sendError(res, "Playlist save error", err);
                    } else {
                        rest.sendSuccess(res, "Playlist Saved: ", fileData);
                    }
                });
            } else {
                rest.sendSuccess(res, "Nothing to Update: ", fileData);
            }
        }
    });

}

