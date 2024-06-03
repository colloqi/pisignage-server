// import fs from "fs/promises";
const fs = require("fs").promises;
// import path from "path";
const path = require("path");

// import util from "util";
const _ = require("lodash");
// import _ from "lodash";

// import { fileUtilModifyHTML } from "../others/file-util.js";
const { fileUtilModifyHTML } = require("../others/file-util.js");

// import { AssetModel } from "../models/assets.js";
const AssetModel = require("../models/assets.js");

// import { config } from "../../config/config.js";
const config = require("../../config/config.js");

// import { restwareSendSuccess, restwareSendError } from "../others/restware.js";
const restwareSendSuccess = require("../others/restware.js").sendSuccess;
const restwareSendError = require("../others/restware.js").sendError;

// import {
//   serverAssetsUpdatePlaylist,
//   serverAssetsStoreDetails,
//   serverAssetsStoreLinkDetails,
// } from "./server-assets.js";

const serverAssetsUpdatePlaylist = require("./server-assets.js").updatePlaylist;
const serverAssetsStoreDetails = require("./server-assets.js").storeDetails;
const serverAssetsStoreLinkDetails =
  require("./server-assets.js").storeLinkDetails;

// import logger from "../others/logger.js";
const logger = require("../others/logger.js");

// export const assetsIndex = (req, res) => {
exports.assetsIndex = (req, res) => {
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
      logger.error("Error reading Asset Collection: " + error);
      return;
    }
  };

  runTasks();
};

exports.assetsCreateFiles = async (req, res) => {
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

    if (filename.match(config.brandRegex)) filename = filename.toLowerCase();

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
    const msg = "File rename error after upload: " + error;
    logger.error(msg);
    return restwareSendError(res, msg);
  }
};

exports.assetsUpdateFileDetails = (req, res) => {
  serverAssetsStoreDetails(req, res);
};

exports.assetsGetFileDetails = async (req, res) => {
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
      logger.error("Error reading Asset Collection: " + error);
      return null;
    }
  };

  getFileDetails(file);
};

exports.assetsDeleteFile = async (req, res) => {
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
        thumbnailPath = path.join(config.thumbnailDir, imageThumbnailName);
      }
    }

    try {
      await AssetModel.remove({ name: file });
    } catch (error) {
      logger.error("unable to delete asset from db," + file);
    }

    try {
      if (file.match(config.videoRegex) || file.match(config.imageRegex)) {
        if (thumbnailPath) {
          await fs.unlink(thumbnailPath);
        }
      }
    } catch (error) {
      logger.error("unable to find/delete thumbnail: " + error);
    }

    return restwareSendSuccess(res, "Deleted file successfully", file);
  } catch (error) {
    return restwareSendError(res, error);
  }
};

exports.assetsUpdateAsset = async (req, res) => {
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
        logger.error("Unable to find asset from db: " + oldName);
      }
      if (!asset) {
        logger.error("Unable to find asset from db: " + oldName);
      } else {
        asset.name = newName;
        await asset.save();
      }

      return restwareSendSuccess(res, "Successfully renamed file to", newName);
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

exports.assetsCreateLinkFile = async (req, res) => {
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

exports.assetsGetLinkFileDetails = async (req, res) => {
  try {
    let fileToRead = req.params["file"];
    let retData = {};

    retData.data = await fs.readFile(config.mediaPath + fileToRead, "utf-8");

    retData.dbdata = await AssetModel.findOne({ name: fileToRead });

    return restwareSendSuccess(res, "link file details", retData);
  } catch (error) {
    return restwareSendError(res, "unable to read link file, error: " + error);
  }
};

exports.assetsUpdatePlaylist = (req, res) => {
  //req.body contain playlist name and assets, for deleted playlist send playlist name and empty assets
  serverAssetsUpdatePlaylist(req.body.playlist, req.body.assets);
  return restwareSendSuccess(res, "asset update has been queued");
};
