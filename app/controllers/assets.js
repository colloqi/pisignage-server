"use strict" // REMOVE AFTER MIGRATING require TO import statements

const fs = require("fs").promises,
    path = require("path"),
    _ = require("lodash"),
    Asset = require("../models/assets.js"),
    Group = require("../models/group.js"),
    config = require("../../config/config.js"),
    logger = require("../others/logger.js");

const restwareSendSuccess = require("../others/restware.js").sendSuccess,
    restwareSendError = require("../others/restware.js").sendError;

const serverAssetsUpdatePlaylist = require("./server-assets.js").updatePlaylist,
    serverAssetsStoreDetails = require("./server-assets.js").storeDetails,
    serverAssetsStoreLinkDetails =
        require("./server-assets.js").storeLinkDetails;

const fileUtilModifyHTML = require("../others/file-util.js").modifyHTML;

/* HELPER FUNCTIONS -------------------------------------------------------------- */
const cleanUpPlaylistName = (dirtyName) => {
    let cleanedUpName = dirtyName;

    // Remove "__" at the start
    cleanedUpName = cleanedUpName.replace(/^__/, "");

    // Remove ".json" at the end
    cleanedUpName = cleanedUpName.replace(/\.json$/, "");

    return cleanedUpName;
};

const isPlaylist = (file) => {
    return file.startsWith("__") && file.endsWith(".json");
};

/* LOAD ALL ASSETS -------------------------------------------------------------- */
exports.index = (req, res) => {
    let files = [];
    let dbdata;

    const readAndSortFiles = async () => {
        try {
            const data = await fs.readdir(config.mediaDir);
            let innerFiles = data.filter(
                (file) => file.charAt(0) != "_" && file.charAt(0) != "."
            );
            if (innerFiles.length)
                return innerFiles.sort((str1, str2) =>
                    str1.localeCompare(str2, undefined, {
                        numeric: true,
                    })
                );
        } catch (error) {
            console.log("Error reading media directory: " + error);
            return [];
        }
    };

    const loadDbData = async () => {
        try {
            const data = await Asset.find({});
            return data;
        } catch (error) {
            logger.error("Error reading Asset Collection: " + error);
            return;
        }
    };

    const sendMediaDirectoryFiles = async () => {
        try {
            files = await readAndSortFiles();
            dbdata = await loadDbData();

            restwareSendSuccess(res, "Sending media directory files: ", {
                files: files,
                dbdata: dbdata,
                systemAssets: config.systemAssets,
            });
        } catch (error) {
            return restwareSendError(res, error);
        }
    };

    sendMediaDirectoryFiles();
};

/* CREATE ASSETS VIA MULTER (see routes.js) --------------------------------------------------- */
exports.createFiles = async (req, res) => {
    let files = [];
    let data = [];

    if (req.files) files = req.files["assets"];
    else return restwareSendError(res, "There are no files to be uploaded");

    const renameFile = async (fileObj) => {
        console.log("Uploaded file: " + fileObj.path);
        let filename = fileObj.originalname
            .replace(config.filenameRegex, "")
            .normalize("NFC");

        let tr = {
            ä: "ae",
            ö: "oe",
            ß: "ss",
            ü: "ue",
            æ: "ae",
            ø: "oe",
            å: "aa",
            é: "e",
            è: "e",
        };
        filename = filename.replace(/[äößüæøåéè]/gi, (matched) => tr[matched]);

        if (filename.match(config.zipfileRegex))
            filename = filename.replace(/ /g, ""); //unzip won't work with spaces in file name

        if (filename.match(config.brandRegex))
            filename = filename.toLowerCase(); // change brand video name

        // const renameAsync = promisify(fs.rename);
        await fs.rename(fileObj.path, path.join(config.mediaDir, filename));

        if (filename.match(/^custom_layout.*html$/i)) {
            fileUtilModifyHTML(config.mediaDir, filename);
        }

        data.push({
            name: filename,
            size: fileObj.size,
            type: fileObj.mimetype,
        });
    };

    try {
        const promisesArray = [];

        for (const file of files) {
            promisesArray.push(await renameFile(file));
        }

        await Promise.all(
            // files.map(async (fileObj) => {
            //   await renameFile(fileObj);
            // })
            promisesArray
        );
        return restwareSendSuccess(res, "Successfully uploaded files", data);
    } catch (error) {
        const msg = `File rename error after upload: ${error.message}`;
        logger.error(msg);
        return restwareSendError(res, msg);
    }
};

/* UPDATE FILE DETAILS ----------------------------------------------------------------------- */
exports.updateFileDetails = async (req, res) => {
    /* 
    CALLS (process-file.js) IN (server-assets.js) WITHIN (exports.storeDetails) 
    */
    await serverAssetsStoreDetails(req, res);

};

/* RETRIEVE FILE DETAILS ---------------------------------------------------------------------- */
exports.getFileDetails = async (req, res) => {
    const file = req.params["file"];

    /* MAIN FUNCTION -------------------------------------------------------------------------- */
    const loadFileDetails = async (file) => {
        try {
            const fileData = await getFileType(file);
            const dbData = await getDBData(file);

            restwareSendSuccess(res, "Sending file details", {
                name: file,
                size: `${~~(fileData.size / 1000)} KB`,
                ctime: fileData.ctime,
                path: `/media/${file}`,
                type: fileData.type,
                dbdata: dbData,
            });
        } catch (error) {
            restwareSendError(res, error);
        }
    };

    /* SUPPORTING FUNCTIONS ------------------------------------------------------------------- */
    const getFileType = async (file) => {
        let fileData;

        try {
            const data = await fs.stat(path.join(config.mediaDir, file));

            fileData = data;
            if (file.match(config.imageRegex)) fileData.type = "image";
            else if (file.match(config.videoRegex)) fileData.type = "video";
            else if (file.match(config.audioRegex)) fileData.type = "audio";
            else if (file.match(config.htmlRegex)) fileData.type = "html";
            else if (
                file.match(config.liveStreamRegex) ||
                file.match(config.omxStreamRegex) ||
                file.match(config.mediaRss) ||
                file.match(config.CORSLink) ||
                file.match(config.linkUrlRegex)
            )
                fileData.type = "link";
            else if (file.match(config.gcalRegex)) fileData.type = "gcal";
            else if (file.match(config.pdffileRegex)) fileData.type = "pdf";
            else if (file.match(config.txtFileRegex)) fileData.type = "text";
            else if (file.match(config.radioFileRegex)) fileData.type = "radio";
            else fileData.type = "other";
        } catch (error) {
            throw new Error(`Unable to read file details: ${error}`);
        }

        return fileData;
    };

    const getDBData = async (file) => {
        try {
            const data = await Asset.findOne({ name: file });
            return data;
        } catch (error) {
            logger.error(`Error reading Asset Collection: ${error}`);
            return null;
        }
    };

    loadFileDetails(file);
};

/* 
    DELETE MEDIA FILE (DB ENTRY, MEDIA ASSET FILE, AND PLAYLIST FILE ENTRY) OR
    DELETE PLAYLIST FILE 
*/
exports.deleteFile = async (req, res) => {
    const file = req.params["file"];

    /* CHECK IF PLAYLIST-FILE IS BEING DELETED - IF NOT (else) PROCEED WITH MEDIA FILE DELETION */
    if (file.startsWith("__") && file.endsWith(".json")) {

        try {
            // extract playlist name ----------------------------------------------------------------------------------- //
            const cleanedUpPlaylistName = cleanUpPlaylistName(file);

            // remove playlist entry from groups ----------------------------------------------------------------------- //
            const groupsWithSpecifiedPlaylist = await Group.find({
                playlists: { $elemMatch: { name: cleanedUpPlaylistName } },
            });
    
            for (const group of groupsWithSpecifiedPlaylist) {

                // handle playlist entries
                const newPlaylists = group.playlists.filter((playlist) => playlist.name !== cleanedUpPlaylistName )
                const newDeployedPlaylists = group.deployedPlaylists.filter((playlist) => playlist.name !== cleanedUpPlaylistName )

                group.playlists = newPlaylists
                group.deployedPlaylists = newDeployedPlaylists

                // handle asset entries
                group.assets.pull(file)
                group.deployedAssets.pull(file)

                // save group with updates
                try {
                    await group.save()
                } catch (error) {
                    console.error(`Error saving group ${group.name} after removing playlist entry: `, { error })
                }
            }
                

            // remove playlist entry from assets in DB ----------------------------------------------------------------- //
            const assetsWithSpecifiedPlaylists = await Asset.find({ playlists: cleanedUpPlaylistName })

            for (const asset of assetsWithSpecifiedPlaylists) {
                asset.playlists.pull(cleanedUpPlaylistName)
            }

            
            // deleting playlist file ---------------------------------------------------------------------------------- //
            await fs.unlink(path.join(config.mediaDir, file));
            
        } catch (error) {
            console.error("Error in deleting playlist file: ", { error })
            logger.error(`Unable to delete playlist file: ${file}`);
        }
        
        return restwareSendSuccess(res, "Deleted playlist successfully: ", file);

    } else {
        /* LOAD DB ENTRY FOR FILE */
        const fileDbData = await Asset.findOne({ name: file });

        /* DELETE THUMBNAIL FILE */
        try {
            if (
                file.match(config.videoRegex) ||
                file.match(config.imageRegex)
            ) {
                let thumbnailPath;

                if (fileDbData && fileDbData["thumbnail"]) {
                    const imageThumbnailName = fileDbData["thumbnail"].replace(
                        "/media/_thumbnails/",
                        ""
                    );

                    thumbnailPath = path.join(
                        config.thumbnailDir,
                        imageThumbnailName
                    );
                }

                if (thumbnailPath) {
                    await fs.unlink(thumbnailPath);
                }
            }
        } catch (error) {
            console.error("Error deleting thumbnail: ", { error });
            logger.error(`unable to find/delete thumbnail: ${error.message}`);
        }

        /* DELETE ASSET FROM PLAYLIST'S FILE */
        try {
            // get playlist names:
            if (fileDbData) {
                const allThePlaylistsThisAssetIsIn = fileDbData.playlists;

                for (const playlist of allThePlaylistsThisAssetIsIn) {
                    // load playlist file into JSON
                    const pathToPlaylistFile = path.join(
                        config.mediaDir,
                        `__${playlist}.json`
                    );

                    const playlistJSON = JSON.parse(
                        await fs.readFile(pathToPlaylistFile, "utf-8")
                    );

                    // playlist file with asset removed:
                    const newPlaylistJSONAssets = playlistJSON.assets.filter(
                        (asset) => asset.filename !== file
                    );
                    playlistJSON.assets = newPlaylistJSONAssets;

                    // write to file:
                    await fs.writeFile(
                        pathToPlaylistFile,
                        JSON.stringify(playlistJSON, null, 4)
                    );
                }
            }
        } catch (error) {
            console.error("Deleting asset from playlist file failed: ", {
                error,
            });
            return restwareSendError(res, error.message);
        }

        /* DELETE ENTRY FROM GROUPS IN DB */
        try {
            const groupsWithAssetToBeDeleted = await Group.find({
                assets: file,
            });

            for (const group of groupsWithAssetToBeDeleted) {
                const newSetOfAssets = group.assets.filter(
                    (asset) => asset != file
                );
                const newSetOfDeployedAssets = group.deployedAssets.filter(
                    (deployedAsset) => deployedAsset != file
                );

                group.assets = newSetOfAssets;
                group.deployedAssets = newSetOfDeployedAssets;

                await group.save();
            }
        } catch (error) {
            console.error(`Error removing asset ${file} from groups: `, {
                error,
            });
            return restwareSendError(res, error.message);
        }

        /* DELETE MEDIA FILE & DB ENTRY */
        try {
            await fs.unlink(path.join(config.mediaDir, file));

            try {
                await Asset.deleteOne({ name: file });
            } catch (error) {
                console.log("Unable to delete asset from db", { error });
                logger.error(`Unable to delete asset from db: ${file}`);
            }
        } catch (error) {
            console.error("Error deleting media file: ", { error });
            return restwareSendError(res, error.message);
        }

        return restwareSendSuccess(res, "Deleted file successfully", file);
    }
};

/* UPDATE ASSET FILE (renaming and extension of existing entry) */
exports.updateAsset = async (req, res) => {
    if (req.body.newname) {
        try {
            const oldName = req.params["file"];
            const newName = req.body.newname;

            // rename asset file ---------------------------------------------------------------------------
            await fs.rename(
                path.join(config.mediaDir, oldName),
                path.join(config.mediaDir, newName)
            );

            // handle playlist rename in assets collection -------------------------------------------------
            if (isPlaylist(oldName)) {

                try {
                    const cleanedUpOldPlaylistName = cleanUpPlaylistName(oldName);
                    const cleanedUpNewPlaylistName = cleanUpPlaylistName(newName);

                    const assetsWithSpecifiedPlaylist = await Asset.find({ playlists: cleanedUpOldPlaylistName })

                    for (const asset of assetsWithSpecifiedPlaylist) {
                        await asset.playlists.pull(cleanedUpOldPlaylistName).push(cleanedUpNewPlaylistName)
                        await asset.save()
                    }
                    
                } catch (error) {
                    console.error("Unable to rename playlist name in DB assets", { error });
                    logger.error(`Unable to rename playlist name in DB assets: ${oldName}`);
                    return restwareSendError(res, "File rename error", error.message);
                }
            }

            // rename asset in DB --------------------------------------------------------------------------
            try {
                await Asset.findOneAndUpdate(
                    { name: oldName },
                    { name: newName }
                );
            } catch (error) {
                console.error("Unable to rename asset in DB", { error });
                logger.error(`Unable to rename asset in DB: ${oldName}`);
                return restwareSendError(res, "File rename error", error.message);
            }

            // rename asset in playlist file ---------------------------------------------------------------
            try {
                // get by newName as the DB entry has already been renamed in the previous block
                const assetDetails = await Asset.findOne({ name: newName }); 

                
                if (assetDetails) {
                    const playlistsAssetIsIn = assetDetails.playlists;

                    for (const playlist of playlistsAssetIsIn) {
                        // load playlist file into JSON
                        const pathToPlaylistFile = path.join(
                            config.mediaDir,
                            `__${playlist}.json`
                        );
    
                        const playlistJSON = JSON.parse(
                            await fs.readFile(pathToPlaylistFile, "utf-8")
                        );
    
                        // rename asset filename in playlist file JSON
                        for (const asset of playlistJSON.assets) {
                            if (asset.filename === oldName)
                                asset.filename = newName;
                        }
    
                        // write back to playlist file:
                        await fs.writeFile(
                            pathToPlaylistFile,
                            JSON.stringify(playlistJSON, null, 4)
                        );
                    }
                }

            } catch (error) {
                console.error("Unable to rename asset in playlist file", { error });
                logger.error(`Unable to rename asset in playlist file: ${oldName}`);
                return restwareSendError(res, "File rename error", error.message);
            }

            // rename asset or playlist file name in groups in DB ------------------------------------------
            try {
                const groupsWithRenamedAsset = await Group.find({ assets: oldName })

                for (const group of groupsWithRenamedAsset) {
                    await group.assets.pull(oldName).push(newName)
                    await group.deployedAssets.pull(oldName).push(newName)
                    await group.save()
                }

            } catch (error) {
                console.error("Unable to rename asset/playlist file name in groups in DB", { error });
                logger.error(`Unable to rename asset/playlist file name in groups in DB: ${oldName}`);
                return restwareSendError(res, "File rename error", error.message);
            }

            // send success response ----------------------------------------------------------------------
            return restwareSendSuccess(
                res,
                "Successfully renamed file to",
                newName
            );
        } catch (error) {
            return restwareSendError(res, "File rename error", error);
        }
    } else if (req.body.dbdata) {
        try {
            let asset = await Asset.load(req.body.dbdata._id);

            if (!asset) {
                return restwareSendError(
                    res,
                    "Categories saving error",
                    "Asset not found"
                );
            }

            asset = _.extend(asset, req.body.dbdata);

            try {
                const savedAsset = await asset.save();
                return restwareSendSuccess(res, "Categories saved", savedAsset);
            } catch (error) {
                return restwareSendError(res, "Categories saving error", error);
            }
        } catch (error) {
            return restwareSendError(
                res,
                "Asset not found: Categories saving error",
                error.message
            );
        }
    }
};

/*
exports.assetsGetCalendar = async (req, res) => {
  const calFile = path.join(config.mediaDir, req.params["file"]);

  try {
    const data = await fs.readFile(calFile, "utf8");
    if (!data) {
      return restwareSendError(res, "Gcal file read error");
    }
    const { gCalIndex } = await import("./gcal.js");
    const calData = JSON.parse(data);
    await gCalIndex(calData);

    return restwareSendSuccess(res, "Sending calendar details", {
      profile: calData.profile,
      list: _.map(list.items, (item) => _.pick(item, "summary", "id")),
      selected: _.find(list.items, { id: calData.selectedEmail }).summary,
    });
  } catch (err) {
    return restwareSendError(res, "Gcal file read error", err);
  }
};

exports.assetsCreateAssetFileFromContent = async (name, data, cb) => {
  const file = path.resolve(config.mediaDir, name);
  try {
    await fs.writeFile(file, JSON.stringify(data, null, 4));
    cb();
  } catch (error) {
    cb(error);
    return;
  }
};

exports.assetsUpdateCalendar = async (req, res) => {
  try {
    const calFile = path.join(config.mediaDir, req.params["file"]);

    const data = await fs.readFile(calFile, "utf8");

    if (!data) return restwareSendError(res, "Gcal file read error");

    const jsonData = JSON.parse(data);
    jsonData.selectedEmail = req.body["email"];

    await assetsCreateAssetFileFromContent(calFile, jsonData);

    restwareSendSuccess(res, "Successfully updated Email");
  } catch (err) {
    return restwareSendError(res, "Error updating Gcal file", err);
  }
};
*/

/* LINK FILE CREATION OPERATION --------------------------------------------------------- */
exports.createLinkFile = async (req, res) => {
    try {
        const details = req.body.details;

        await fs.writeFile(
            path.join(config.mediaPath, `${details.name}${details.type}`),
            JSON.stringify(details, null, 4),
            "utf8"
        );

        /* 
            CALLS (process-file.js) IN (server-assets.js) WITHIN (exports.storeLinkDetails) 
        */
        await serverAssetsStoreLinkDetails(
            `${details.name}${details.type}`,
            "link",
            req.body.categories
        );

        return restwareSendSuccess(
            res,
            `Link file created for the link as ${details.name}${details.type}`
        );
    } catch (error) {
        console.error("Error in creating link file: ", { error })
        return restwareSendError(res, "error in creating link file", error.message);
    }
};

/* GET LINK FILE DETAILS ---------------------------------------------------------------- */
exports.getLinkFileDetails = async (req, res) => {
    try {
        const file = req.params["file"];
        const retData = {};

        retData.data = await fs.readFile(
            path.join(config.mediaPath, file),
            "utf-8"
        );

        retData.dbdata = await Asset.findOne({ name: file });

        return restwareSendSuccess(res, "link file details", retData);
    } catch (error) {
        return restwareSendError(
            res,
            `unable to read link file, error: ${error.message}`
        );
    }
};

/* UPDATE ASSET PLAYLIST ----------------------------------------------------------------- */
exports.updatePlaylist = async (req, res) => {
    // handled in server-assets.js
    //req.body contain playlist name and assets, for deleted playlist send playlist name and empty assets
    await serverAssetsUpdatePlaylist(req.body.playlist, req.body.assets);
    return restwareSendSuccess(res, "asset update has been queued");
};
