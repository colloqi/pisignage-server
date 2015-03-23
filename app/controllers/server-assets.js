'use strict';

var path = require('path'),
    FFmpeg = require('fluent-ffmpeg'),
    probe = require('node-ffprobe'),
    imageMagick = require('gm').subClass({imageMagick: true}),
    config = require('../../config/config'),
    fs = require('fs'),
    async = require('async'),
    mongoose = require('mongoose'),
    Asset = mongoose.model('Asset'),
    _ = require('lodash'),
    rest = require('../others/restware');

var sendResponse = function (res, err) {
    if (err) {
        return rest.sendError(res, 'Assets data queued for processing, but with errors: ', err);
    } else {
        return rest.sendSuccess(res, 'Queued for Processing');
    }
}

exports.storeDetails = function (req, res) {

    var errorMessages = [];

    var files = req.body.files,
        installation = req.installation,
        assetDir = path.join(config.mediaDir, req.installation);

    var processFile = function (fileObj, array_cb) {
        var src = path.join(assetDir, fileObj.name),
            ext = path.extname(fileObj.name),
            destName = path.basename(fileObj.name, ext) + '_c.mp4',
            destPath = path.join(assetDir, destName),
            type,
            duration,
            resolution,
            thumbnail;

        async.series([
                function (task_cb) {
                    if (fileObj.name.match(config.imageRegex)) {
                        type = 'image';
                        async.series([
                            function (img_cb) {
                                imageMagick(src)
                                    .autoOrient()
                                    .resize(64)
                                    .write(path.join(config.thumbnailDir, fileObj.name), function (err) {
                                        console.log(' imageKick write done: ' + fileObj.name + ';error:' + err);
                                        if (err)
                                            errorMessages.push(err);
                                        thumbnail = "/media/_thumbnails/" + fileObj.name;
                                        img_cb();
                                    });
                            },
                            function (img_cb) {
                                imageMagick(src).size(function (err, value) {
                                    if (err)
                                        errorMessages.push(err);
                                    resolution = value;
                                    img_cb();
                                });
                            }
                        ], function () {
                            task_cb();
                        })
                    } else if (fileObj.name.match(config.videoRegex)) {
                        type = 'video';
                        var filePath = src;
                        async.series([
                            function (video_cb) {
                                probe(src, function (err, metadata) {
                                    console.dir(metadata);
                                    if (metadata && metadata.streams) {
                                        var vdoInfo = _.find(metadata.streams, {'codec_type': 'video'});
                                        var formatName;
                                        if (metadata.format)
                                            formatName = metadata.format.format_name;
                                        if ((vdoInfo && vdoInfo.codec_name != 'h264') || (formatName.indexOf('mp4') == -1)) {
                                            new FFmpeg({source: src})
                                                .audioCodec('libfdk_aac')
                                                .videoCodec('libx264')
                                                .size('?x720')
                                                .toFormat('mp4')
                                                .on('error', function (err, stdout, stderr) {
                                                    console.log('Conversion Err: ' + err);
                                                    console.log("stdout: " + stdout);
                                                    console.log("stderr: " + stderr);
                                                    errorMessages.push(err.message);
                                                    video_cb();
                                                })
                                                .on('end', function () {
                                                    fs.unlink(src, function (err) {
                                                        if (err) {
                                                            console.log('Conversion Src Unlink Err: ' + err);
                                                            errorMessages.push(err.message);
                                                        }
                                                        fileObj.name = destName;
                                                        filePath = destPath;
                                                        video_cb();
                                                    })
                                                })
                                                .saveToFile(destPath);
                                        } else {
                                            video_cb();
                                        }
                                    } else {
                                        video_cb();
                                    }
                                });
                            },
                            function (video_cb) {
                                probe(filePath, function (err, metadata) {
                                    if (metadata) {
                                        duration = metadata.format.duration;
                                        var vdoInfo = _.find(metadata.streams, {'codec_type': 'video'});
                                        if (vdoInfo) {
                                            resolution = {
                                                width: vdoInfo.width,
                                                height: vdoInfo.height
                                            }
                                        }
                                    }
                                    video_cb();
                                });
                            },
                            function (video_cb) {
                                new FFmpeg({source: filePath})
                                    .on('error', function (err) {
                                        console.log('ffmpeg, An error occurred: ' + err.message);
                                        errorMessages.push(err.message);
                                        video_cb()
                                    })
                                    .on('end', function (filenames) {
                                        thumbnail = "/media/_thumbnails/" + fileObj.name + '_1.png';
                                        video_cb()
                                    })
                                    .takeScreenshots({
                                        size: '64x64',
                                        count: 1,
                                        timemarks: ['10'],
                                        filename: fileObj.name + '.png'
                                    }, config.thumbnailDir);
                            }
                        ], function () {
                            task_cb();
                        })
                    } else {
                        if (fileObj.name.match(config.noticeRegex))
                            type = 'notice';
                        task_cb();
                    }
                }],
            function (err) {
                Asset.findOne({name: fileObj.name}, function (err, data) {
                    var asset,
                        object = {
                            name: fileObj.name,
                            type: type,
                            resolution: resolution,
                            duration: ~~duration,
                            size: ~~(fileObj.size / 1000) + ' KB',
                            labels: req.body.categories,
                            installation: installation,
                            thumbnail: thumbnail,

                            createdBy: {_id: req.user._id, name: req.user.username}
                        };
                    if (object.duration == 10)      //hack for default avoidance
                        object.duration = 11;

                    if (err || !data) {
                        asset = new Asset(object);
                    } else {
                        asset = _.extend(data, object)
                    }
                    asset.save(function (err) {
                        if (err)
                            errorMessages = errorMessages.push(err);
                        array_cb();
                    })
                })
            }
        )
    }
    async.eachSeries(files, processFile, function () {
        if (errorMessages.length > 0) {
            console.log('store details(media processing) error messages: ')
            console.log(errorMessages.join());
        } else {
            console.log('Successfully processed files: ', files.join())
        }
    });
    sendResponse(res);
}
