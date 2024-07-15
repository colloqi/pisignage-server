const config = require("../../config/config.js"),
    AssetModel = require("./../models/assets.js"),
    _ = require("lodash");

const rest = require("../others/restware");
const processFile = require("./../others/process-file.js").processFile;

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

/* WIP */
exports.storeDetails = async (req, res) => {
    const files = req.body.files;

    try {
        for (const file of files) {
            const filename = file.name.replace(config.filenameRegex, "");
            await processFile(filename, file.size, req.body.categories);
        }

        console.log(`Processed ${files.length} files`);
    } catch (error) {
        console.error("Error in processing files: ", error);
    }

    // const processFilePromise = (...args) => {
    //   return new Promise((resolve, reject) => {
    //     processFile.processFile(...args, (err) => {
    //       if (err) return reject(err);
    //       return resolve();
    //     });
    //   });
    // };

    // const processFiles = async (files) => {
    //   try {
    //     for (const fileObj of files) {
    //       const filename = fileObj.name.replace(config.filenameRegex, "");
    //       await processFilePromise(filename, fileObj.size, req.body.categories);
    //     }

    //     console.log("processed " + files.length + " files");
    //   } catch (error) {
    //     console.log("error in processing files: ", error);
    //   }
    // };

    // processFiles(files);

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

exports.storeLinkDetails = async (name, type, categories, cb) => {
    await processFile(name, 0, categories || [], function (err) {
        cb();
    });
};

/* NOT USED ANYWHERE --------------------------------------------------------

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
---------------------------------------------------------------------------- */

/* UPDATE PLAYLIST (to support this function in assets.js) */
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

};
