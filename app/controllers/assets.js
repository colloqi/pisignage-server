import fs from "fs/promises";
import path from "path";

import util from "util";
import _ from "lodash";

import { fileUtilModifyHTML } from "../others/file-util.js";

import { AssetModel } from "../models/assets.js";
import { config } from "../../config/config.js";

import { restwareSendSuccess, restwareSendError } from "../others/restware.js";
import {
    serverAssetsUpdatePlaylist,
    serverAssetsStoreDetails,
    serverAssetsStoreLinkDetails,
} from "./server-assets.js";

export const assetsIndex = (req, res) => {
    let files = [];
    let dbdata;

    const runTasks = async () => {
        try {
            files = await task1();
            dbdata = await task2();

            restwareSendSuccess(res, "Sending media directory files: ", {
                files: files,
                dbdata: dbdata,
                systemAssets: config.systemAssets,
            });
        } catch (error) {
            return restwareSendError(res, error);
        }
    };

    const task1 = async () => {
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

    const task2 = async () => {
        try {
            const data = await AssetModel.find({});
            return data;
        } catch (error) {
            util.log("Error reading Asset Collection: " + error);
            return;
        }
    };

    runTasks();
};

export const assetsCreateFiles = async (req, res) => {
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
            filename = filename.replace(/ /g, "");

        if (filename.match(config.brandRegex))
            filename = filename.toLowerCase();

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
        await Promise.all(
            files.forEach(async (fileObj) => {
                await renameFile(fileObj);
            })
        );
        return restwareSendSuccess(res, "Successfully uploaded files", data);
    } catch (error) {
        const msg = "File rename error after upload: " + error;
        util.log(msg);
        return restwareSendError(res, msg);
    }
};

export const assetsUpdateFileDetails = (req, res) => {
    serverAssetsStoreDetails(req, res);
};

export const assetsGetFileDetails = async (req, res) => {
    const file = req.params["file"];

    const getFileDetails = async (file) => {
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
            const data = await AssetModel.findOne({ name: file });
            return data;
        } catch (error) {
            util.log("Error reading Asset Collection: " + error);
            return null;
        }
    };

    getFileDetails(file);
};

export const assetsDeleteFile = async (req, res) => {
    try {
        const file = req.params["file"];
        // let ext = path.extname(file);
        let thumbnailPath = null;

        await fs.unlink(path.join(config.mediaDir, file));

        if (file.match(config.videoRegex) || file.match(config.imageRegex)) {
            const dbData = await AssetModel.findOne({ name: file });

            if (dbData && dbData["thumbnail"]) {
                const imageThumbnailName = dbData["thumbnail"].replace(
                    "/media/_thumbnails/",
                    ""
                );
                thumbnailPath = path.join(
                    config.thumbnailDir,
                    imageThumbnailName
                );
            }
        }

        try {
            await AssetModel.remove({ name: file });
        } catch (error) {
            util.log("unable to delete asset from db," + file);
        }

        try {
            if (
                file.match(config.videoRegex) ||
                file.match(config.imageRegex)
            ) {
                if (thumbnailPath) {
                    await fs.unlink(thumbnailPath);
                }
            }
        } catch (error) {
            util.log("unable to find/delete thumbnail: " + error);
        }

        return restwareSendSuccess(res, "Deleted file successfully", file);
    } catch (error) {
        return restwareSendError(res, error);
    }
};

export const assetsUpdateAsset = async (req, res) => {
    if (req.body.newname) {
        try {
            const oldName = req.params["file"];
            const newName = req.body.newname;

            await fs.rename(
                path.join(config.mediaDir, oldName),
                path.join(config.mediaDir, newName)
            );

            let asset;
            try {
                asset = await AssetModel.findOne({ name: oldName });
            } catch (error) {
                util.log("Unable to find asset from db: " + oldName);
            }
            if (!asset) {
                util.log("Unable to find asset from db: " + oldName);
            } else {
                asset.name = newName;
                await asset.save();
            }

            return restwareSendSuccess(
                res,
                "Successfully renamed file to",
                newName
            );
        } catch (error) {
            restwareSendError(res, error);
        }
    } else if (req.body.dbdata) {
        let asset;
        try {
            asset = await AssetModel.load(req.body.dbdata._id);
        } catch (error) {
            return restwareSendError(
                res,
                "Categories saving error",
                "Asset not found"
            );
        }
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
            return restwareSendError(res, "Categories saving error", err);
        }
    }
};

export const assetsGetCalendar = async (req, res) => {
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

export const assetsCreateAssetFileFromContent = async (name, data, cb) => {
    const file = path.resolve(config.mediaDir, name);
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 4));
        cb();
    } catch (error) {
        cb(error);
        return;
    }
};

export const assetsUpdateCalendar = async (req, res) => {
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

export const assetsCreateLinkFile = async (req, res) => {
    try {
        let details = req.body.details;
        await fs.writeFile(
            config.mediaPath + details.name + details.type,
            JSON.stringify(details, null, 4),
            "utf8"
        );

        serverAssetsStoreLinkDetails(
            details.name + details.type,
            "link",
            req.body.categories
        );

        return restwareSendSuccess(
            res,
            "Link file created for the link as " + details.name + details.type
        );
    } catch (error) {
        return restwareSendError(res, "error in creating link file", error);
    }
};

export const assetsGetLinkFileDetails = async (req, res) => {
    try {
        let fileToRead = req.params["file"];
        let retData = {};

        retData.data = await fs.readFile(
            config.mediaPath + fileToRead,
            "utf-8"
        );

        retData.dbdata = await AssetModel.findOne({ name: fileToRead });

        return restwareSendSuccess(res, "link file details", retData);
    } catch (error) {
        return restwareSendError(
            res,
            "unable to read link file, error: " + error
        );
    }
};

export const assetsUpdatePlaylist = (req, res) => {
    //req.body contain playlist name and assets, for deleted playlist send playlist name and empty assets
    serverAssetsUpdatePlaylist(req.body.playlist, req.body.assets);
    return restwareSendSuccess(res, "asset update has been queued");
};
