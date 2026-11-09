
import config from '../../config/config.js';

import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../others/restware.js';
import { processFile } from '../others/process-file.js';


const Asset = mongoose.model('Asset');

const sendResponse = (res, err) => {
    if (err) {
        return sendError(res, 'Assets data queued for processing, but with errors: ', err);
    } else {
        return sendSuccess(res, 'Queued for Processing');
    }
};

export const storeDetails = async (req, res) => {
    const files = req.body.files;
    // Guard before responding: without this, a missing/non-array `files` would
    // throw in the for-loop *after* the response is sent → unhandled rejection.
    if (!Array.isArray(files)) {
        return sendError(res, 'No files to process');
    }
    sendResponse(res);

    for (const fileObj of files) {
        // Declared outside the try so the catch can log it — referencing a
        // try-scoped const there threw a ReferenceError (an unhandled rejection
        // after the response was already sent) whenever processFile failed.
        let filename = fileObj?.name;
        try {
            filename = fileObj.name.replace(config.filenameRegex, '');
            await processFile(filename, fileObj.size, req.body.categories);
        } catch (err) {
            console.error(`processFile failed for ${filename}:`, err);
        }
    }
    console.log(`processed ${files.length} files`);
};

export const storeLinkDetails = async (name, type, categories) => {
    await processFile(name, 0, categories || []);
};

export const updateObject = (req, res) => {
    Asset.findById(req.body.dbdata._id)
        .then((asset) => {
            if (!asset) {
                return sendError(res, 'Categories saving error', new Error('Asset not found'));
            }

            delete req.body.dbdata.__v; // do not copy version key
            
            // ✅ Better: Use Mongoose's set() method
            asset.set(req.body.dbdata);

            return asset.save();
        })
        .then((data) => {
            return sendSuccess(res, 'Categories saved', data);
        })
        .catch((err) => {
            return sendError(res, 'Categories saving error', err);
        });
};

export const updatePlaylist = async (playlist, assets) => {
    await Asset.updateMany(
        { playlists: playlist },
        { $pull: { playlists: playlist } }
    );
    
    await Asset.updateMany(
        { name: { $in: assets } },
        { $push: { playlists: playlist } }
    );
    // Errors automatically propagate to caller
};
