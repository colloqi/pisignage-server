'use strict';

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    util = require('util'),
    _ = require('lodash'),
    fileUtil = require('../others/file-util');

var mongoose = require('mongoose'),
    Asset = mongoose.model('Asset'),
    config = require('../../config/config'),
    rest = require('../others/restware');

exports.index = function (req, res) {

    var files,dbdata;
    async.series([
        function(next) {
            fs.readdir(config.mediaDir, function (err, data) {
                if (err) {
                    next("Error reading media directory: " + err)
                } else {
                    files = data.filter(function (file) {
                        return (file.charAt(0) != '_' && file.charAt(0) != '.');
                    });
                    next();
                }
            })
        },
        function(next)  {
            Asset.find({}, function (err, data) {
                if (err) {
                    util.log("Error reading Asset Collection: "+err);
                } else {
                    dbdata = data;
                }
                next();
            })
        }
    ], function(err) {
        if (err)
            rest.sendError(res,err);
        else
            rest.sendSuccess(res, "Sending media directory files: ",
                {files: files, dbdata: dbdata, systemAssets: config.systemAssets})

    });
}


exports.createFiles = function (req, res) {

    var files = req.files["assets"],
        data = [];

    async.each(files, renameFile, function (err) {
        if (err) {
            var msg = "File rename error after upload: "+err;
            util.log(msg);
            return rest.sendError(res, msg);
        } else {
            return rest.sendSuccess(res, ' Successfully uploaded files', data);
        }
    })

    function renameFile(fileObj, next) {
        console.log("Uploaded file: "+fileObj.path);
        var filename = fileObj.originalname.replace(config.filenameRegex, '');
        fs.rename(fileObj.path, path.join(config.mediaDir, filename), function (err) {
            if (err) {
                next(err);
            } else {
                if((filename).match(/^custom_layout.*html$/i)){
                    fileUtil.modifyHTML(config.mediaDir,filename)
                }
                data.push({
                    name: filename,
                    size: fileObj.size,
                    type: fileObj.mimetype
                });
                next();
            }
        });
    }

}

exports.updateFileDetails = function (req, res) {
    require('./server-assets').storeDetails(req, res);
}

exports.getFileDetails = function (req, res) {
    var file = req.params['file'],
        fileData,
        dbData;

    async.series([
        function(next) {
            fs.stat(path.join(config.mediaDir, file), function (err, data) {
                if (err) {
                    next('Unable to read file details: '+ err);
                } else {
                    fileData = data;
                    if (file.match(config.imageRegex))
                        fileData.type = 'image';
                    else if (file.match(config.videoRegex))
                        fileData.type = 'video';
                    else if (file.match(config.audioRegex))
                        fileData.type = 'audio';
                    else if (file.match(config.htmlRegex))
                        fileData.type = 'html';
                    else if (file.match(config.liveStreamRegex) || file.match(config.linkUrlRegex))
                        fileData.type = 'link';
                    else if (file.match(config.gcalRegex))
                        fileData.type = 'gcal';
                    else
                        fileData.type = 'other';
                    next();
                }
            })
        },
        function(next) {
            Asset.findOne({name: file}, function (err, data) {
                if (err) {
                    util.log("Error reading Asset Collection: " + err);
                } else {
                    dbData = data;
                }
                next();
            })
        }
    ],function(err){
        if (err)
            rest.sendError(res,err);
        else
            rest.sendSuccess(res, 'Sending file details',
                    {
                        name: file,
                        size: ~~(fileData.size / 1000) + ' KB',
                        ctime: fileData.ctime,
                        path: '/media/' +  file,
                        type: fileData.type,
                        dbdata: dbData
                    });
    })
}

exports.deleteFile = function (req, res) {

    var file = req.params['file'],
        ext = path.extname(file);

    async.series([
        function(next) {
            fs.unlink(path.join(config.mediaDir, file), function (err) {
                if (err)
                    next("Unable to delete file " + file + ';' + err)
                else
                    next()
            })
        },
        function(next) {
            Asset.remove({name: file}, function (err) {
                if (err)
                    util.log('unable to delete asset from db,' + file)
                next();
            })
        },
        function(next) {
            var thumbnailPath = path.join(config.thumbnailDir, file);
            if (file.match(config.videoRegex))
                thumbnailPath += '.png';
            if(file.match(config.videoRegex) || file.match(config.imageRegex)){
                fs.unlink(thumbnailPath, function (err) {
                    if (err)
                        util.log('unable to find/delete thumbnail: ' + err)
                    next();
                })
            } else {
                next()
            }
        }
    ], function(err) {
        if (err)
            rest.sendError(res,err);
        else
            return rest.sendSuccess(res, 'Deleted file successfully', file);
    })
}

exports.updateAsset = function (req, res) {

    if (req.body.newname) {
        var oldName = req.params['file'],
            newName = req.body.newname;

        async.series([
            function(next) {
                fs.rename(path.join(config.mediaDir, oldName), path.join(config.mediaDir, newName), function (err) {
                    if (err) {
                        next('File rename error: '+ err);
                    } else {
                        next();
                    }
                });
            },
            function(next) {
                Asset.findOne({name: oldName}, function(err, asset){
                    if (err || !asset) {
                        util.log('unable to find asset from db,' + oldName)
                        return next();
                    }
                    asset.name = newName;
                    asset.save(function(err) {
                        if (err)
                            util.log('unable to save asset after rename,' + oldName)
                        next();
                    });
                });
            }
        ], function(err) {
            if (err)
                rest.sendError(res,err);
            else
                return rest.sendSuccess(res, 'Successfully renamed file to', newName);
        })
    } else if (req.body.dbdata) {
        Asset.load(req.body.dbdata._id, function (err, asset) {
            if (err || !asset) {
                return rest.sendError(res, 'Categories saving error', err);
            } else {
                asset = _.extend(asset, req.body.dbdata);
                asset.save(function (err, data) {
                    if (err)
                        return rest.sendError(res, 'Categories saving error', err);

                    return rest.sendSuccess(res, 'Categories saved', data);
                });
            }
        })
    }
}

exports.getCalendar = function (req, res) {
    var calFile = path.join(config.mediaDir, req.params['file']);

    fs.readFile(calFile, 'utf8', function (err, data) {
        if (err || !data)
            return rest.sendError(res, 'Gcal file read error', err);

        var calData = JSON.parse(data);
        require('./gcal').index(calData, function (err, list) {
            if (err) {
                return rest.sendError(res, 'Gcal error', err);
            } else {
                return rest.sendSuccess(res, 'Sending calendar details',
                    {
                        profile: calData.profile,
                        list: _.map(list.items, function (item) {
                            return _.pick(item, 'summary', 'id')
                        }),
                        selected: _.find(list.items, {'id': calData.selectedEmail}).summary
                    }
                );
            }
        })
    });
}

exports.createAssetFileFromContent = function (name, data, cb) {
    var file = path.resolve(config.mediaDir, name);
    fs.writeFile(file, JSON.stringify(data, null, 4), cb);
}

exports.updateCalendar = function (req, res) {
    var calFile = path.join(config.mediaDir,  req.params['file']);

    fs.readFile(calFile, 'utf8', function (err, data) {
        if (err || !data)
            return rest.sendError(res, 'Gcal file read error', err);
        data = JSON.parse(data);
        data.selectedEmail = req.body['email'];
        exports.createAssetFileFromContent(calFile, data, function () {
            if (err)
                return rest.sendError(res, 'Gcal file write error', err);
            else
                return rest.sendSuccess(res, 'Successfully updated Email');
        });
    });
}

exports.createLinkFile = function (req, res) {
    var details = req.body.details;

    async.series([
        function (next) {
            fs.writeFile(config.mediaPath + details.name + details.type, JSON.stringify(details, null, 4), 'utf8', function (err) {
                next(err);
            })
        },function(next) {
                require('./server-assets').storeLinkDetails(details.name+details.type,
                    'link',
                    req.body.categories,
                    next
                );
        }], function(err) {
                if (err)
                    return rest.sendError(res, 'error in creating link file', err);
                else
                    return rest.sendSuccess(res, 'Link file created for the link as ' + details.name + details.type);
        })
}

exports.getLinkFileDetails = function (req, res) {
    var fileToRead = req.params['file'];

    var retData = {}

    async.series([
        function (next) {
            fs.readFile(config.mediaPath + fileToRead, 'utf-8', function (err, data) {
                retData.data = data
                next(err)
            })
        }, function (next) {
            Asset.findOne({name: fileToRead}, function (err, dbdata) {
                retData.dbdata = dbdata
                next()
            })
    }], function (err) {
        if (err) {
            return rest.sendError(res, 'unable to read link file, error:' + err);
        } else {
            return rest.sendSuccess(res, 'link file details', retData);
        }
    })
}

exports.updatePlaylist = function (req,res) {
    //req.body contain playlist name and assets, for deleted playlist send playlist name and empty assets
    require('./server-assets').updatePlaylist(req.body.playlist, req.body.assets);
    return rest.sendSuccess(res, 'asset update has been queued');
}
