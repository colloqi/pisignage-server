// var path = require("path"),
//   FFmpeg = require("fluent-ffmpeg"),
//   probe = require("node-ffprobe"),
//   imageMagick = require("gm").subClass({ imageMagick: true }),
const config = require("../../config/config.js");
const AssetModel = require("./../models/assets.js");

const _ = require("lodash");
const rest = require("../others/restware");
const processFile = require("./../others/process-file.js");
//   fs = require("fs"),
// async = require('async'),
//   mongoose = require("mongoose"),
//   Asset = mongoose.model("Asset"),

const sendResponse = (res, err) => {
  if (err) {
    return rest.sendError(
      res,
      "Assets data queued for processing, but with errors: ",
      err
    );
  } else {
    return rest.sendSuccess(res, "Queued for Processing");
  }
};

exports.storeDetails = (req, res) => {
  const files = req.body.files;

  const processFilePromise = (...args) => {
    return new Promise((resolve, reject) => {
      processFile.processFile(...args, (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  };

  const processFiles = async (files) => {
    try {
      for (const fileObj of files) {
        const filename = fileObj.name.replace(config.filenameRegex, "");
        await processFilePromise(filename, fileObj.size, req.body.categories);
      }

      console.log("processed " + files.length + " files");
    } catch (error) {
      console.log("error in processing files: ", error);
    }
  };

  processFiles(files);

  //   async.eachSeries(
  //     files,
  //     function (fileObj, array_cb) {
  //       var filename = fileObj.name.replace(config.filenameRegex, "");
  //       processFile.processFile(
  //         filename,
  //         fileObj.size,
  //         req.body.categories,
  //         array_cb
  //       );
  //     },
  //     function () {
  //       console.log("processed " + files.length + " files");
  //     }
  //   );
  sendResponse(res);
};

exports.storeLinkDetails = (name, type, categories, cb) => {
  processFile.processFile(name, 0, categories || [], function (err) {
    cb();
  });
};

// exports.updateObject = function(req,res) {
//     Asset.load(req.body.dbdata._id, function (err, asset) {
//         if (err || !asset) {
//             return rest.sendError(res, 'Categories saving error', err);
//         } else {
//             delete req.body.dbdata.__v;        //do not copy version key
//             asset = _.extend(asset, req.body.dbdata);
//             asset.save(function (err, data) {
//                 if (err)
//                     return rest.sendError(res, 'Categories saving error', err);

//                 return rest.sendSuccess(res, 'Categories saved', data);
//             });
//         }
//     })
// }

exports.updatePlaylist = async (playlist, assets) => {
  try {
    await AssetModel.updateMany(
      { playlists: playlist },
      { $pull: { playlists: playlist } },
      { multi: true }
    );

    await AssetModel.updateMany(
      { name: { $in: assets } },
      { $push: { playlists: playlist } },
      { multi: true }
    );
  } catch (error) {
    console.log("error in db update for playlist in assets " + error);
  }
  return;

  /*
  Asset.updateMany(
    { playlists: playlist },
    { $pull: { playlists: playlist } },
    { multi: true },
    function (err, num) {
      if (err) {
        return console.log("error in db update for playlist in assets " + err);
      } else {
        //console.log("Deleted playlist from "+num+" records")

        Asset.update(
          { name: { $in: assets } },
          { $push: { playlists: playlist } },
          { multi: true },
          function (err, num) {
            if (err) {
              return console.log(
                "error in db update for playlist in assets " + err
              );
            } else {
              //console.log("Updated playlist to "+num+" records")
            }
          }
        );
      }
    }
  );
  */
};
