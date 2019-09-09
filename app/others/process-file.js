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
    _ = require('lodash');

exports.processFile = function (filename, filesize, categories, cb) {
    var errorMessages = [],
        assetDir = path.join(config.mediaDir);

    var src = path.join(assetDir, filename),
        ext = path.extname(filename),
        destName = path.basename(filename, ext) + '_c.mp4',
        destPath = path.join(assetDir, destName),
        mediaSize = parseInt(filesize / 1000) + 'KB',
        type,
        duration,
        resolution,
        thumbnail,
        random = Math.floor(Math.random() * 10000) + '_';

    async.series([
            function (task_cb) {
                if (filename.match(config.imageRegex)) {
                    type = 'image';
                    async.series([
                        function (img_cb) {
                            imageMagick(src)
                                .autoOrient()
                                .resize(64)
                                .write(path.join(config.thumbnailDir, random+filename), function (err) {
                                    console.log(' imageKick write done: ' + filename + ';error:' + err);
                                    if (err)
                                        errorMessages.push(err);
                                    thumbnail = "/media/_thumbnails/" + random+filename;
                                    img_cb();
                                });
                        },
                        function(img_cb){ // resize image
                            imageMagick(src)
                                .autoOrient()
                                .resize(3840,3840,'>')
                                .write(src,function(err,op1){
                                    if(err)
                                        console.log("Image resize error for : "+src +"  "+err);
                                    img_cb();
                                })
                        },
                        function (img_cb) {
                            imageMagick(src).filesize(function(err,value){
                                if (value) {
                                    var multipleB = value.lastIndexOf("B",value.length-2)
                                    if (multipleB > 0)
                                        value = value.slice(multipleB+1)
                                    mediaSize = value;
                                }
                                img_cb();
                            })
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
                } else if (filename.match(config.videoRegex)) {
                    type = 'video';
                    var filePath = src;
                    async.series([
                        function (video_cb) {
                            probe(src, function (err, metadata) {
                                //console.dir(metadata);
                                if (metadata && metadata.streams) {
                                    var vdoInfo = _.find(metadata.streams, {'codec_type': 'video'});
                                    var formatName;
                                    if (metadata.format)
                                        formatName = metadata.format.format_name;
                                    if ((vdoInfo && vdoInfo.codec_name != 'h264') ||
                                        (formatName.indexOf('mp4') == -1) ||
                                        (vdoInfo && vdoInfo.pix_fmt == 'yuv422p')
                                    ) {
                                        new FFmpeg({source: src})
                                            .audioCodec('libfdk_aac')
                                            .videoCodec('libx264')
                                            .size('?x1080')
                                            .toFormat('mp4')
                                            .outputOptions([
                                                '-profile:v high',
                                                '-level 4.0',
                                                '-pix_fmt yuv420p'
                                            ])
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
                                                    filename = destName;
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
                                if (err || !metadata || !metadata.format) {
                                    console.log("probe error "+filePath+";"+err.message)
                                    console.log(metadata);
                                    return video_cb();
                                }
                                if (metadata) {
                                    console.log(metadata);
                                    duration = metadata.format.duration;
                                    if (metadata.format.size)
                                        mediaSize = parseInt(metadata.format.size / 1000) + 'KB';

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
                            var snaptime = duration >= 10 ? 8 : 2;
                            new FFmpeg({source: filePath})
                                .on('error', function (err) {
                                    console.log('ffmpeg, An error occurred: ' + err.message);
                                    errorMessages.push(err.message);
                                    video_cb()
                                })
                                .on('end', function (filenames) {
                                    thumbnail = "/media/_thumbnails/" + random+filename + '.png';
                                    video_cb()
                                })
                                .takeScreenshots({
                                    size: '64x64',
                                    count: 1,
                                    timemarks: [snaptime],
                                    filename: random+filename + '.png'
                                }, config.thumbnailDir);
                        }
                    ], function () {
                        task_cb();
                    })
                } else if (filename.match(config.audioRegex)) {
                    type = 'audio'
                    var filePath = src;
                    probe(filePath, function (err, metadata) {
                        //console.log(err, metadata);
                        if (err) {
                            console.log('Error getting audio file info ')
                            errorMessages.push(err.message);
                        } else {
                            duration = metadata.format.duration;
                            if (metadata.format.size)
                                mediaSize = parseInt(metadata.format.size / 1000) + 'KB';
                        }
                        task_cb();
                    })
                } else {
                    if (filename.match(config.noticeRegex))
                        type = 'notice';
                    else if(filename.match(config.txtFileRegex))
                        type= 'text';
                    else if(filename.match(config.pdffileRegex))
                        type = 'pdf';
                    else if(filename.match(config.radioFileRegex))
                        type = 'radio';

                    task_cb();
                }
            }],
        function (err) {
            Asset.findOne({name: filename}, function (err, data) {
                var asset,
                    object = {
                        name: filename,
                        type: type,
                        resolution: resolution,
                        duration: ~~duration,
                        size: mediaSize,
                        labels: categories,
                        thumbnail: thumbnail,
                        createdAt: Date.now()
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
                    if (errorMessages.length > 0) {
                        console.log('store details(media processing) error messages: '+filename)
                        console.log(errorMessages.join());
                    } else {
                        console.log('Successfully processed file: '+filename)
                    }
                    cb();
                })
            })
        }
    )
}