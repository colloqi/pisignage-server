"use strict"; // REMOVE AFTER MIGRATING require TO import statements

const path = require("path"),
    FFmpeg = require("fluent-ffmpeg"),
    probe = require("node-ffprobe"),
    imageMagick = require("gm").subClass({ imageMagick: true }),
    config = require("../../config/config"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    Asset = mongoose.model("Asset"),
    _ = require("lodash");

exports.processFile = async (filename, filesize, categories) => {
    const errorMessages = [],
        assetDir = path.join(config.mediaDir);

    const src = path.join(assetDir, filename),
        ext = path.extname(filename),
        destName = `${path.basename(filename, ext)}_c.mp4`,
        destPath = path.join(assetDir, destName),
        random = `${Math.floor(Math.random() * 10000)}_`;

    let type, duration, resolution, thumbnail;
    let mediaSize = parseInt(filesize / 1000) + "KB";

    /* 
    OPERATIONS STRUCTURE:
        1/ IMAGE FILE PROCESSING:
            - OP 1: async => create thumbnail
            - OP 2: async => resize image
            - OP 3: async => get media size
            - op 4: async => get resolution
            - empty callback results
        2/ VIDEO FILE PROCESSING:
            - op 1: convert to MP4
            - op 2: get video file details (duration, mediaSize and video resolution)
            - op 3: create video thumbnail
        3/ AUDIO FILE PROCESSING:
            - single operation: get file details 
        4.../ REST OF THEM
            - notice
            - text
            - pdf
            - radio
                - set file type for each
    */

    /* Process uploaded files -------------------------------------------------------------------*/
    if (filename.match(config.imageRegex)) {
        type = "image";

        // image processing: helper functions --------------------------------------------------------- //
        const createThumbnail = () => {
            return new Promise((resolve, reject) => {
                imageMagick(src)
                    .autoOrient()
                    .resize(64)
                    .write(
                        path.join(config.thumbnailDir, `${random}${filename}`),
                        (error) => {
                            if (error) {
                                errorMessages.push(error);

                                console.error(
                                    `imageKick write done: ${filename}; error: ${error}`
                                );

                                return reject(error);
                            }

                            thumbnail = `/media/_thumbnails/${random}${filename}`;

                            resolve(thumbnail);
                        }
                    );
            });
        };

        const resizeImage = () => {
            return new Promise((resolve, reject) => {
                imageMagick(src)
                    .autoOrient()
                    .resize(3840, 3840, ">")
                    .write(src, (error) => {
                        if (error) {
                            console.error(
                                `Image resize error for ${src}: ${error}`
                            );
                            errorMessages.push(error);
                            return reject(error);
                        }

                        resolve();
                    });
            });
        };

        const setMediaSize = () => {
            return new Promise((resolve, reject) => {
                imageMagick(src).filesize((error, value) => {
                    if (error) {
                        errorMessages.push(error);
                        return reject(error);
                    }

                    if (value) {
                        var multipleB = value.lastIndexOf(
                            "B",
                            value.length - 2
                        );
                        if (multipleB > 0) value = value.slice(multipleB + 1);
                        mediaSize = value;

                        resolve(mediaSize);
                    }
                });
            });
        };

        const getImageResolution = () => {
            return new Promise((resolve, reject) => {
                imageMagick(src).size((error, value) => {
                    if (error) {
                        errorMessages.push(error);
                        return reject(error);
                    }
                    resolution = value;

                    return resolve(resolution);
                });
            });
        };

        // image processing: main function ------------------------------------------------------------ //
        const processImage = async () => {
            try {
                await createThumbnail();
                await resizeImage();
                await setMediaSize();
                await getImageResolution();
            } catch (error) {
                console.error(`Error processing image file: ${filename}`, {
                    error,
                });
            }
        };

        // image processing: main function invocation ------------------------------------------------ //
        await processImage();
    } else if (filename.match(config.videoRegex)) {
        type = "video";
        let filePath = src;

        // video processing: helper functions ------------------------------------------------ //
        const convertToMP4 = () => {
            return new Promise((resolve, reject) => {
                probe(src, (error, metadata) => {
                    if (error) {
                        errorMessages.push(error);
                        return reject(error);
                    }

                    if (metadata && metadata.streams) {
                        const vdoInfo = _.find(metadata.streams, {
                            codec_type: "video",
                        });

                        let formatName;

                        if (metadata.format)
                            formatName = metadata.format.format_name;

                        if (
                            (vdoInfo && vdoInfo.codec_name != "h264") ||
                            formatName.indexOf("mp4") === -1 ||
                            (vdoInfo && vdoInfo.pix_fmt == "yuv422p") ||
                            parseInt(vdoInfo.width) * parseInt(vdoInfo.height) >
                                2073600 //1080p pixels
                        ) {
                            new FFmpeg({ source: src })
                                .audioCodec("libfdk_aac")
                                // .audioCodec("aac")
                                .videoCodec("libx264")
                                .size("?x1080")
                                .toFormat("mp4")
                                .outputOptions([
                                    "-profile:v high",
                                    "-level 4.0",
                                    "-pix_fmt yuv420p",
                                ])
                                .on("error", (error, stdout, stderr) => {
                                    console.log(`Conversion Error: ${error}`);
                                    console.log(`stdout: ${stdout}`);
                                    console.log(`stderr: ${stderr}`);

                                    errorMessages.push(error.message);

                                    return reject(error);
                                })
                                .on("end", async () => {
                                    // yet to be tested since libx264 is missing on my local
                                    try {
                                        await fs.promises.unlink(src);
                                        filename = destName;
                                        filePath = destPath;
                                    } catch (error) {
                                        console.log(
                                            "Conversion Src Unlink Err: ",
                                            { error }
                                        );
                                        errorMessages.push(error.message);

                                        return reject(error);
                                    }
                                })
                                // .saveToFile(destPath);
                                .output(destPath);

                            resolve();
                        } else {
                            resolve();
                        }
                    } else {
                        return reject();
                    }
                });
            });
        };

        const getVideoDetails = () => {
            return new Promise((resolve, reject) => {
                probe(filePath, (error, metadata) => {
                    if (error || !metadata || !metadata.format) {
                        console.log(
                            `probe error ${filePath}: ${error.message}`
                        );
                        return reject();
                    }
                    if (metadata) {
                        duration = metadata.format.duration;
                        if (metadata.format.size)
                            mediaSize =
                                parseInt(metadata.format.size / 1000) + "KB";

                        var vdoInfo = _.find(metadata.streams, {
                            codec_type: "video",
                        });
                        if (vdoInfo) {
                            resolution = {
                                width: vdoInfo.width,
                                height: vdoInfo.height,
                            };
                        }
                    }
                    resolve();
                });
            });
        };

        const createVideoThumbnail = () => {
            return new Promise((resolve, reject) => {
                const snaptime = duration >= 10 ? 8 : 2;
                new FFmpeg({ source: filePath })
                    .on("error", (error) => {
                        console.error(
                            `ffmpeg, An error occurred: ${error.message}`
                        );
                        errorMessages.push(error.message);
                        return reject(error);
                    })
                    .takeScreenshots(
                        {
                            size: "64x64",
                            count: 1,
                            timemarks: [snaptime],
                            filename: `${random}${filename}.png`,
                        },
                        config.thumbnailDir
                    );
                thumbnail = `/media/_thumbnails/${random}${filename}.png`;
                resolve();
            });
        };

        // video processing: main function --------------------------------------------------- //
        const processVideo = async () => {
            try {
                await convertToMP4();
                await getVideoDetails();
                await createVideoThumbnail();
            } catch (error) {
                console.error(`Error processing video file: ${filename}`, {
                    error,
                });
            }
        };

        // video processing: main function invocation ---------------------------------------- //
        await processVideo();
    } else if (filename.match(config.audioRegex)) {
        type = "audio";
        let filePath = src;

        // audio processing: ------------------------------------------------ //
        const getAudioFileDetails = () => {
            return new Promise((resolve, reject) => {
                probe(filePath, (error, metadata) => {
                    if (error) {
                        console.log("Error getting audio file info ");
                        errorMessages.push(error.message);
                        return reject(error);
                    } else {
                        duration = metadata.format.duration;
                        if (metadata.format.size)
                            mediaSize =
                                parseInt(metadata.format.size / 1000) + "KB";
                        resolve();
                    }
                });
            });
        };

        // audio processing: function invocation ---------------------------------------- //
        await getAudioFileDetails();
    } else {
        if (filename.match(config.noticeRegex)) type = "notice";
        else if (filename.match(config.txtFileRegex)) type = "text";
        else if (filename.match(config.pdffileRegex)) type = "pdf";
        else if (filename.match(config.radioFileRegex)) type = "radio";
    }

    // wrap-up file processing: ------------------------------------------------ //
    const fileDetails = {
        name: filename,
        type,
        resolution,
        duration: ~~duration,
        size: mediaSize,
        labels: categories,
        thumbnail,
        createdAt: Date.now(),
    };

    if (fileDetails.duration === 10) fileDetails.duration = 11; // hack for default avoidance

    let fileDbData;
    try {
        fileDbData = await Asset.findOne({ name: filename });
    } catch (error) {
        fileDbData = new Asset(fileDetails);
    }

    if (!fileDbData) fileDbData = new Asset(fileDetails);
    else _.extend(fileDbData, fileDetails);

    try {
        await fileDbData.save();
    } catch (error) {
        console.error("Error saving file details in DB: ", { error })
        errorMessages.push(error);
    }

    if (errorMessages.length > 0) {
        console.log(`Errors in processing uploaded file: ${filename}`);
        for (const error of errorMessages) {
            console.error({ error });
        }
    } else {
        console.log(`Successfully processed file: ${filename}`);
    }

};
