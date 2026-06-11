// 'use strict';
//
// var path = require('path'),
//     FFmpeg = require('fluent-ffmpeg'),
//     probe = require('node-ffprobe'),
//     imageMagick = require('gm').subClass({imageMagick: true}),
//     config = require('../../config/config.js'),
//     fs = require('fs'),
//     async = require('async'),
//     mongoose = require('mongoose'),
//     Asset = mongoose.model('Asset'),
//     _ = require('lodash');
//
// exports.processFile = function (filename, filesize, categories, cb) {
//     var errorMessages = [],
//         assetDir = path.join(config.mediaDir);
//
//     var src = path.join(assetDir, filename),
//         ext = path.extname(filename),
//         destName = path.basename(filename, ext) + '_c.mp4',
//         destPath = path.join(assetDir, destName),
//         mediaSize = parseInt(filesize / 1000) + 'KB',
//         type,
//         duration,
//         resolution,
//         thumbnail,
//         random = Math.floor(Math.random() * 10000) + '_';
//
//     async.series([
//             function (task_cb) {
//                 if (filename.match(config.imageRegex)) {
//                     type = 'image';
//                     async.series([
//                         function (img_cb) {
//                             imageMagick(src)
//                                 .autoOrient()
//                                 .resize(64)
//                                 .write(path.join(config.thumbnailDir, random+filename), function (err) {
//                                     console.log(' imageKick write done: ' + filename + ';error:' + err);
//                                     if (err)
//                                         errorMessages.push(err);
//                                     thumbnail = "/media/_thumbnails/" + random+filename;
//                                     img_cb();
//                                 });
//                         },
//                         function(img_cb){ // resize image
//                             imageMagick(src)
//                                 .autoOrient()
//                                 .resize(3840,3840,'>')
//                                 .write(src,function(err,op1){
//                                     if(err)
//                                         console.log("Image resize error for : "+src +"  "+err);
//                                     img_cb();
//                                 })
//                         },
//                         function (img_cb) {
//                             imageMagick(src).filesize(function(err,value){
//                                 if (value) {
//                                     var multipleB = value.lastIndexOf("B",value.length-2)
//                                     if (multipleB > 0)
//                                         value = value.slice(multipleB+1)
//                                     mediaSize = value;
//                                 }
//                                 img_cb();
//                             })
//                         },
//                         function (img_cb) {
//                             imageMagick(src).size(function (err, value) {
//                                 if (err)
//                                     errorMessages.push(err);
//                                 resolution = value;
//                                 img_cb();
//                             });
//                         }
//                     ], function () {
//                         task_cb();
//                     })
//                 } else if (filename.match(config.videoRegex)) {
//                     type = 'video';
//                     var filePath = src;
//                     async.series([
//                         function (video_cb) {
//                             probe(src, function (err, metadata) {
//                                 //console.dir(metadata);
//                                 if (metadata && metadata.streams) {
//                                     var vdoInfo = _.find(metadata.streams, {'codec_type': 'video'});
//                                     var formatName;
//                                     if (metadata.format)
//                                         formatName = metadata.format.format_name;
//                                     if ((vdoInfo && vdoInfo.codec_name != 'h264') ||
//                                         (formatName.indexOf('mp4') == -1) ||
//                                         (vdoInfo && vdoInfo.pix_fmt == 'yuv422p') ||
//                                         (parseInt(vdoInfo.width) * parseInt(vdoInfo.height) > 2073600 )   //1080p pixels
//                                     ) {
//                                         new FFmpeg({source: src})
//                                             .audioCodec('libfdk_aac')
//                                             .videoCodec('libx264')
//                                             .size('?x1080')
//                                             .toFormat('mp4')
//                                             .outputOptions([
//                                                 '-profile:v high',
//                                                 '-level 4.0',
//                                                 '-pix_fmt yuv420p'
//                                             ])
//                                             .on('error', function (err, stdout, stderr) {
//                                                 console.log('Conversion Err: ' + err);
//                                                 console.log("stdout: " + stdout);
//                                                 console.log("stderr: " + stderr);
//                                                 errorMessages.push(err.message);
//                                                 video_cb();
//                                             })
//                                             .on('end', function () {
//                                                 fs.unlink(src, function (err) {
//                                                     if (err) {
//                                                         console.log('Conversion Src Unlink Err: ' + err);
//                                                         errorMessages.push(err.message);
//                                                     }
//                                                     filename = destName;
//                                                     filePath = destPath;
//                                                     video_cb();
//                                                 })
//                                             })
//                                             .saveToFile(destPath);
//                                     } else {
//                                         video_cb();
//                                     }
//                                 } else {
//                                     video_cb();
//                                 }
//                             });
//                         },
//                         function (video_cb) {
//                             probe(filePath, function (err, metadata) {
//                                 if (err || !metadata || !metadata.format) {
//                                     console.log("probe error "+filePath+";"+err.message)
//                                     console.log(metadata);
//                                     return video_cb();
//                                 }
//                                 if (metadata) {
//                                     duration = metadata.format.duration;
//                                     if (metadata.format.size)
//                                         mediaSize = parseInt(metadata.format.size / 1000) + 'KB';
//
//                                     var vdoInfo = _.find(metadata.streams, {'codec_type': 'video'});
//                                     if (vdoInfo) {
//                                         resolution = {
//                                             width: vdoInfo.width,
//                                             height: vdoInfo.height
//                                         }
//                                     }
//                                 }
//                                 video_cb();
//                             });
//                         },
//                         function (video_cb) {
//                             var snaptime = duration >= 10 ? 8 : 2;
//                             new FFmpeg({source: filePath})
//                                 .on('error', function (err) {
//                                     console.log('ffmpeg, An error occurred: ' + err.message);
//                                     errorMessages.push(err.message);
//                                     video_cb()
//                                 })
//                                 .on('end', function (filenames) {
//                                     thumbnail = "/media/_thumbnails/" + random+filename + '.png';
//                                     video_cb()
//                                 })
//                                 .takeScreenshots({
//                                     size: '64x64',
//                                     count: 1,
//                                     timemarks: [snaptime],
//                                     filename: random+filename + '.png'
//                                 }, config.thumbnailDir);
//                         }
//                     ], function () {
//                         task_cb();
//                     })
//                 } else if (filename.match(config.audioRegex)) {
//                     type = 'audio'
//                     var filePath = src;
//                     probe(filePath, function (err, metadata) {
//                         //console.log(err, metadata);
//                         if (err) {
//                             console.log('Error getting audio file info ')
//                             errorMessages.push(err.message);
//                         } else {
//                             duration = metadata.format.duration;
//                             if (metadata.format.size)
//                                 mediaSize = parseInt(metadata.format.size / 1000) + 'KB';
//                         }
//                         task_cb();
//                     })
//                 } else {
//                     if (filename.match(config.noticeRegex))
//                         type = 'notice';
//                     else if(filename.match(config.txtFileRegex))
//                         type= 'text';
//                     else if(filename.match(config.pdffileRegex))
//                         type = 'pdf';
//                     else if(filename.match(config.radioFileRegex))
//                         type = 'radio';
//
//                     task_cb();
//                 }
//             }],
//         function (err) {
//             Asset.findOne({name: filename}, function (err, data) {
//                 var asset,
//                     object = {
//                         name: filename,
//                         type: type,
//                         resolution: resolution,
//                         duration: ~~duration,
//                         size: mediaSize,
//                         labels: categories,
//                         thumbnail: thumbnail,
//                         createdAt: Date.now()
//                     };
//                 if (object.duration == 10)      //hack for default avoidance
//                     object.duration = 11;
//
//                 if (err || !data) {
//                     asset = new Asset(object);
//                 } else {
//                     asset = _.extend(data, object)
//                 }
//                 asset.save(function (err) {
//                     if (err)
//                         errorMessages = errorMessages.push(err);
//                     if (errorMessages.length > 0) {
//                         console.log('store details(media processing) error messages: '+filename)
//                         console.log(errorMessages.join());
//                     } else {
//                         console.log('Successfully processed file: '+filename)
//                     }
//                     cb();
//                 })
//             })
//         }
//     )
// }

'use strict';

// ES6 imports
import path from 'path';
import FFmpeg from 'fluent-ffmpeg';
import probe from 'node-ffprobe';
import gm from 'gm';
const imageMagick = gm.subClass({ imageMagick: true });
import config from '../../config/config.js';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Asset } from '../models/assets.js';

export const processFile = async (filename, filesize, categories) => {
    const errorMessages = [];
    const assetDir = path.join(config.mediaDir);

    const src = path.join(assetDir, filename);
    const ext = path.extname(filename);
    const destName = path.basename(filename, ext) + '_c.mp4';
    const destPath = path.join(assetDir, destName);
    let mediaSize = parseInt(filesize / 1000) + 'KB';
    let type, duration, resolution, thumbnail;
    const random = Math.floor(Math.random() * 10000) + '_';
    let filePath = src;

    try {
        // Process different file types
        if (filename.match(config.imageRegex)) {
            type = 'image';
            
            // Process image: create thumbnail
            await new Promise((resolve, reject) => {
                imageMagick(src)
                    .autoOrient()
                    .resize(64)
                    .write(path.join(config.thumbnailDir, random + filename), (err) => {
                        console.log(`imageKick write done: ${filename}; error: ${err}`);
                        if (err) {
                            errorMessages.push(err);
                        }
                        thumbnail = "/media/_thumbnails/" + random + filename;
                        resolve();
                    });
            });

            // Resize image to max 3840x3840
            await new Promise((resolve) => {
                imageMagick(src)
                    .autoOrient()
                    .resize(3840, 3840, '>')
                    .write(src, (err) => {
                        if (err) {
                            console.log(`Image resize error for: ${src} ${err}`);
                        }
                        resolve();
                    });
            });

            // Get file size
            await new Promise((resolve) => {
                imageMagick(src).filesize((err, value) => {
                    if (value) {
                        const multipleB = value.lastIndexOf("B", value.length - 2);
                        if (multipleB > 0) {
                            value = value.slice(multipleB + 1);
                        }
                        mediaSize = value;
                    }
                    resolve();
                });
            });

            // Get resolution
            await new Promise((resolve) => {
                imageMagick(src).size((err, value) => {
                    if (err) {
                        errorMessages.push(err);
                    }
                    resolution = value;
                    resolve();
                });
            });

        } else if (filename.match(config.videoRegex)) {
            type = 'video';

            // Check if video needs conversion.
            // node-ffprobe@3 is promise-based and ignores a callback argument.
            // The old callback-style call left this Promise unsettled, hanging
            // processFile forever so the asset was never saved to the DB.
            let metadata = null;
            try {
                metadata = await probe(src);
            } catch (err) {
                console.log(`probe error ${src}; ${err.message}`);
            }

            if (metadata && metadata.streams) {
                // Use native Array.find() instead of lodash
                const vdoInfo = metadata.streams.find(stream => stream.codec_type === 'video');
                const formatName = metadata.format?.format_name || '';

                const needsConversion = (vdoInfo && vdoInfo.codec_name !== 'h264') ||
                    (formatName.indexOf('mp4') === -1) ||
                    (vdoInfo && vdoInfo.pix_fmt === 'yuv422p') ||
                    (parseInt(vdoInfo.width) * parseInt(vdoInfo.height) > 2073600); // 1080p pixels

                if (needsConversion) {
                    await new Promise((resolve, reject) => {
                        new FFmpeg({ source: src })
                            .audioCodec('aac')   // libfdk_aac isn't in most ffmpeg builds; aac is built-in
                            .videoCodec('libx264')
                            .size('?x1080')
                            .toFormat('mp4')
                            .outputOptions([
                                '-profile:v high',
                                '-level 4.0',
                                '-pix_fmt yuv420p'
                            ])
                            .on('error', (err, stdout, stderr) => {
                                console.log('Conversion Err: ' + err);
                                console.log("stdout: " + stdout);
                                console.log("stderr: " + stderr);
                                errorMessages.push(err.message);
                                resolve();
                            })
                            .on('end', async () => {
                                try {
                                    await fsPromises.unlink(src);
                                    filename = destName;
                                    filePath = destPath;
                                    resolve();
                                } catch (err) {
                                    console.log('Conversion Src Unlink Err: ' + err);
                                    errorMessages.push(err.message);
                                    resolve();
                                }
                            })
                            .saveToFile(destPath);
                    });
                }
            }

            // Get video metadata (promise-based; see note above)
            let videoMetadata = null;
            try {
                videoMetadata = await probe(filePath);
            } catch (err) {
                console.log(`probe error ${filePath}; ${err.message}`);
            }

            if (videoMetadata) {
                duration = videoMetadata.format?.duration;
                if (videoMetadata.format?.size) {
                    mediaSize = parseInt(videoMetadata.format.size / 1000) + 'KB';
                }

                // Use native Array.find() instead of lodash
                const vdoInfo = videoMetadata.streams.find(stream => stream.codec_type === 'video');
                if (vdoInfo) {
                    resolution = {
                        width: vdoInfo.width,
                        height: vdoInfo.height
                    };
                }
            }

            // Create video thumbnail
            const snaptime = duration >= 10 ? 8 : 2;
            await new Promise((resolve) => {
                new FFmpeg({ source: filePath })
                    .on('error', (err) => {
                        console.log('ffmpeg, An error occurred: ' + err.message);
                        errorMessages.push(err.message);
                        resolve();
                    })
                    .on('end', () => {
                        thumbnail = "/media/_thumbnails/" + random + filename + '.png';
                        resolve();
                    })
                    .takeScreenshots({
                        size: '64x64',
                        count: 1,
                        timemarks: [snaptime],
                        filename: random + filename + '.png'
                    }, config.thumbnailDir);
            });

        } else if (filename.match(config.audioRegex)) {
            type = 'audio';

            let audioMetadata = null;
            try {
                audioMetadata = await probe(filePath);
            } catch (err) {
                console.log('Error getting audio file info');
                errorMessages.push(err.message);
            }

            if (audioMetadata) {
                duration = audioMetadata.format?.duration;
                if (audioMetadata.format?.size) {
                    mediaSize = parseInt(audioMetadata.format.size / 1000) + 'KB';
                }
            }

        } else {
            // Other file types
            if (filename.match(config.noticeRegex)) {
                type = 'notice';
            } else if (filename.match(config.txtFileRegex)) {
                type = 'text';
            } else if (filename.match(config.pdffileRegex)) {
                type = 'pdf';
            } else if (filename.match(config.radioFileRegex)) {
                type = 'radio';
            }
        }

        // Save to database (Mongoose 8 - async/await)
        const existingAsset = await Asset.findOne({ name: filename });

        const assetData = {
            name: filename,
            type: type,
            resolution: resolution,
            duration: ~~duration,
            size: mediaSize,
            labels: categories,
            thumbnail: thumbnail,
            createdAt: Date.now()
        };

        // Hack for default avoidance
        if (assetData.duration === 10) {
            assetData.duration = 11;
        }

        let asset;
        if (!existingAsset) {
            asset = new Asset(assetData);
        } else {
            // Use Object.assign instead of lodash _.extend
            asset = Object.assign(existingAsset, assetData);
        }

        await asset.save();

        if (errorMessages.length > 0) {
            console.log(`store details(media processing) error messages: ${filename}`);
            console.log(errorMessages.join());
            throw new Error(errorMessages.join(', '));
        } else {
            console.log(`Successfully processed file: ${filename}`);
        }

    } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        throw error;
    }
};