"use strict" // REMOVE AFTER MIGRATING require TO import statements

const config = require("../../config/config.js"),
    Asset = require("./../models/assets.js"),
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

/* PROCESS AND STORE DETAILS OF UPLOADED FILES */
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

    sendResponse(res);
};

/* STORE DETAILS OF LINKS */
exports.storeLinkDetails = async (name, type, categories) => {
    await processFile(name, 0, categories || []);
};

/* NOT USED ANYWHERE --------------------------------------------------------
exports.updateObject = function(req,res) {
    Asset.load(req.body.dbdata._id, function (err, asset) {
        if (err || !asset) {
            return rest.sendError(res, 'Categories saving error', err);
        } else {
            delete req.body.dbdata.__v;        //do not copy version key
            asset = _.extend(asset, req.body.dbdata);
            asset.save(function (err, data) {
                if (err)
                    return rest.sendError(res, 'Categories saving error', err);

                return rest.sendSuccess(res, 'Categories saved', data);
            });
        }
    })
}
---------------------------------------------------------------------------- */

/* UPDATE PLAYLIST (to support this function in assets.js) */
exports.updatePlaylist = async (playlist, assets) => {
    try {
        await Asset.updateMany(
            { playlists: playlist },
            { $pull: { playlists: playlist } },
            { multi: true }
        );

        await Asset.updateMany(
            { name: { $in: assets } },
            { $push: { playlists: playlist } },
            { multi: true }
        );
    } catch (error) {
        console.error(`Error in db update for playlist in assets: `, { error });
    }
    return;

};
