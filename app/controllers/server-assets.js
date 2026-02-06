
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

export const storeDetails = (req, res) => {
    const files = req.body.files;

    // Process files sequentially without async library
    const processFilesSequentially = (fileArray, index = 0) => {
        if (index >= fileArray.length) {
            console.log(`processed ${fileArray.length} files`);
            return;
        }

        const fileObj = fileArray[index];
        const filename = fileObj.name.replace(config.filenameRegex, '');
        
        processFile(filename, fileObj.size, req.body.categories, () => {
            processFilesSequentially(fileArray, index + 1);
        });
    };

    processFilesSequentially(files);
    sendResponse(res);
};

export const storeLinkDetails = (name, type, categories, cb) => {
    processFile(name, 0, categories || [], (err) => {
        cb();
    });
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
