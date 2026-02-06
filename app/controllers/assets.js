
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import * as fileUtil from '../others/file-util.js';

// At the top of assets.js
import * as serverAssets from './server-assets.js';

import mongoose from 'mongoose';
import { Asset } from '../models/assets.js';
import config from '../../config/config.js';
import * as rest from '../others/restware.js';


export const index = async (req, res) => {
    try {
        // Read and filter files
        const fileList = await fs.readdir(config.mediaDir);
        const files = fileList
            .filter(file => file.charAt(0) !== '_' && file.charAt(0) !== '.')
            .sort((str1, str2) => str1.localeCompare(str2, undefined, {numeric: true}));
        
        // Read database with separate error handling
        let dbdata = [];
        try {
            dbdata = await Asset.find({});
        } catch (dbErr) {
            console.error('Error reading Asset Collection:', dbErr);
            // Continue anyway with empty dbdata
        }
        
        // Send response (with files even if DB failed)
        return rest.sendSuccess(res, "Sending media directory files:", {
            files,
            dbdata,
            systemAssets: config.systemAssets
        });
        
    } catch (err) {
        // Only file system errors reach here
        return rest.sendError(res, 'Unable to read media directory', err);
    }
};


export const createFiles = async (req, res) => {
    try {
        // Validate uploaded files
        if (!req.files || !req.files.assets) {
            return rest.sendError(res, "There are no files to be uploaded");
        }
        
        const files = req.files.assets;
        const data = [];
        const renameErrors = [];
        
        // Process each file
        for (const fileObj of files) {
            console.log(`Uploaded file: ${fileObj.path}`);
            
            // Step 1: Handle multer bug - fix encoding issue
            // https://github.com/expressjs/multer/issues/1104
            const originalName = Buffer.from(
                fileObj.originalname || fileObj.name, 
                "latin1"
            ).toString("utf8");
            
            // Step 2: Sanitize filename
            let filename = originalName
                .replace(config.filenameRegex, '')
                .normalize("NFC");
            
            // Validate filename
            if (!filename || filename.trim() === '') {
                console.error(`Invalid file name: ${originalName}`);
                renameErrors.push(`Invalid file name: ${originalName}`);
                continue;  // Skip this file, process next
            }
            
            // Step 3: Replace special European characters
            const charMap = {
                "ä": "ae", "ö": "oe", "ß": "ss", "ü": "ue",
                "æ": "ae", "ø": "oe", "å": "aa", "é": "e", "è": "e"
            };
            filename = filename.replace(/[äößüæøåéè]/gi, matched => charMap[matched]);
            
            // Step 4: Remove spaces from ZIP files (unzip won't work with spaces)
            if (filename.match(config.zipfileRegex)) {
                filename = filename.replace(/ /g, '');
            }
            
            // Step 5: Lowercase brand video names
            if (filename.match(config.brandRegex)) {
                filename = filename.toLowerCase();
            }
            
            // Step 6: Move file from temp upload directory to media directory
            const destPath = path.join(config.mediaDir, filename);
            
            try {
                await fs.rename(fileObj.path, destPath);
            } catch (renameErr) {
                const errMsg = `File rename error, ${filename}: ${renameErr.message}`;
                console.error(errMsg);
                renameErrors.push(errMsg);
                continue;  // Skip this file, process next
            }
            
            // Step 7: Modify custom HTML layouts if needed
            if (filename.match(/^custom_layout.*html$/i)) {
                try {
                    fileUtil.modifyHTML(config.mediaDir, filename);
                } catch (htmlErr) {
                    console.error(`HTML modification error for ${filename}:`, htmlErr);
                    // Non-fatal, continue
                }
            }
            
            // Step 8: Store file metadata for response
            data.push({
                name: filename,
                size: fileObj.size,
                type: fileObj.mimetype || fileObj.type
            });
        }
        
        // Check if any files were processed successfully
        if (data.length === 0 && renameErrors.length > 0) {
            // All files failed
            return rest.sendError(res, `File upload failed: ${renameErrors.join('; ')}`);
        }
        
        // Some or all files processed successfully
        if (renameErrors.length > 0) {
            // Partial success - some files failed
            return rest.sendSuccess(res, 'Files uploaded with errors', {
                files: data,
                errors: renameErrors
            });
        }
        
        // Complete success - all files uploaded
        return rest.sendSuccess(res, 'Successfully uploaded files', data);
        
    } catch (err) {
        console.error('Error uploading files:', err);
        return rest.sendError(res, 'Error uploading files', err);
    }
};

export const updateFileDetails = async (req, res) => {
    return serverAssets.storeDetails(req, res);
};



// Helper function for file type detection
export const getFileType = (file) => {
    // Priority 1: Check link types first (all return 'link')
    if (file.match(config.liveStreamRegex) ||
        file.match(config.omxStreamRegex) ||
        file.match(config.mediaRss) ||
        file.match(config.CORSLink) ||
        file.match(config.linkUrlRegex)) {
        return 'link';
    }
    
    // Priority 2: Check other specific file types
    const typeMap = [
        { pattern: config.imageRegex, type: 'image' },
        { pattern: config.videoRegex, type: 'video' },
        { pattern: config.audioRegex, type: 'audio' },
        { pattern: config.htmlRegex, type: 'html' },
        { pattern: config.pdffileRegex, type: 'pdf' },
        { pattern: config.txtFileRegex, type: 'text' },
        { pattern: config.radioFileRegex, type: 'radio' },
        { pattern: config.gcalRegex, type: 'gcal' },
        { pattern: config.zipfileRegex, type: 'zip' },
        { pattern: config.repofileRegex, type: 'repo' },
        { pattern: config.localFolderRegex, type: 'local' }
    ];
    
    for (const { pattern, type } of typeMap) {
        if (file.match(pattern)) return type;
    }
    
    // Priority 3: Fallback for unknown types
    return 'other';
};

// Main function
export const getFileDetails = async (req, res) => {
    try {
        const fileName = req.params.file;
        
        // Step 1: Get file stats from filesystem
        let fileData;
        try {
            const stats = await fs.stat(path.join(config.mediaDir, fileName));
            fileData = {
                size: stats.size,
                ctime: stats.ctime,
                mtime: stats.mtime
            };
        } catch (err) {
            return rest.sendError(res, `Unable to read file details: ${err.message}`);
        }
        
        // Step 2: Detect file type
        const fileType = getFileType(fileName);
        
        // Step 3: Get database data (non-blocking)
        let dbData = null;
        try {
            dbData = await Asset.findOne({ name: fileName });
        } catch (err) {
            console.error('Error reading Asset Collection:', err);
        }
        
        // Step 4: Send response
        return rest.sendSuccess(res, 'Sending file details', {
            name: fileName,
            size: `${Math.floor(fileData.size / 1024)} KB`,
            ctime: fileData.ctime,
            path: `/media/${fileName}`,
            type: fileType,
            dbdata: dbData
        });
        
    } catch (err) {
        console.error('Error in getFileDetails:', err);
        return rest.sendError(res, 'Error getting file details', err);
    }
};





export const deleteFile = async (req, res) => {
    try {
        const fileName = req.params.file;
        let thumbnailPath = null;
        
        // Step 1: Delete main file from disk (critical - stops if fails)
        try {
            await fs.unlink(path.join(config.mediaDir, fileName));
        } catch (err) {
            return rest.sendError(res, `Unable to delete file ${fileName}: ${err.message}`);
        }
        
        // Step 2: Get thumbnail path if video/image (non-blocking)
        if (fileName.match(config.videoRegex) || fileName.match(config.imageRegex)) {
            try {
                const dbData = await Asset.findOne({ name: fileName });
                if (dbData && dbData.thumbnail) {
                    const thumbnailName = dbData.thumbnail.replace("/media/_thumbnails/", "");
                    thumbnailPath = path.join(config.thumbnailDir, thumbnailName);
                }
            } catch (err) {
                console.error('Error fetching thumbnail path:', err);
                // Continue anyway
            }
        }
        
        // Step 3: Delete database record (non-blocking)
        try {
            await Asset.deleteOne({ name: fileName });
        } catch (err) {
            console.error(`Unable to delete asset from db: ${fileName}`, err);
            // Continue anyway - file already deleted
        }
        
        // Step 4: Delete thumbnail if exists (non-blocking)
        if (thumbnailPath) {
            try {
                await fs.unlink(thumbnailPath);
            } catch (err) {
                console.error('Unable to find/delete thumbnail:', err);
                // Continue anyway
            }
        }
        
        // Step 5: Send success response
        return rest.sendSuccess(res, 'Deleted file successfully', fileName);
        
    } catch (err) {
        console.error('Error in deleteFile:', err);
        return rest.sendError(res, 'Error deleting file', err);
    }
};


export const updateAsset = async (req, res) => {
    try {
        // ==========================================
        // USE CASE 1: RENAME FILE
        // ==========================================
        if (req.body.newname) {
            const oldName = req.params.file;
            const newName = req.body.newname;
            const oldPath = path.join(config.mediaDir, oldName);
            const newPath = path.join(config.mediaDir, newName);
            
            // ✅ VALIDATION: Check if new name is valid
            if (!newName || newName.trim() === '') {
                return rest.sendError(res, 'New filename cannot be empty');
            }
            
            // ✅ VALIDATION: Check if names are the same
            if (oldName === newName) {
                return rest.sendError(res, 'New name is the same as old name');
            }
            
            // ✅ VALIDATION: Sanitize filename (optional but recommended)
            const sanitizedNewName = newName.replace(config.filenameRegex, '').normalize("NFC");
            if (sanitizedNewName !== newName) {
                return rest.sendError(res, 'Filename contains invalid characters');
            }
            
            // ✅ STEP 0: PRE-CHECK - Does new name already exist in database?
            try {
                const existingAsset = await Asset.findOne({ name: newName });
                if (existingAsset) {
                    return rest.sendError(res, `File with name "${newName}" already exists in database`);
                }
            } catch (err) {
                console.error('Error checking for existing asset:', err);
                return rest.sendError(res, 'Error checking for existing file');
            }
            
            
            // ✅ STEP 1: RENAME FILE on disk
            try {
                await fs.rename(oldPath, newPath);
            } catch (err) {
                console.error('File rename failed:', err);
                return rest.sendError(res, `File rename error: ${err.message}`);
            }
            
            // ✅ STEP 2: UPDATE DATABASE with automatic rollback on failure
            try {
                const asset = await Asset.findOne({ name: oldName });
                
                if (!asset) {
                    // File renamed but no DB record - acceptable edge case
                    console.warn('File renamed but no database record found:', oldName);
                    return rest.sendSuccess(res, 'File renamed successfully (no database record)', newName);
                }
                
                // Update name and save
                asset.name = newName;
                await asset.save();
                
            } catch (dbErr) {
                // ❌ DATABASE UPDATE FAILED - ROLLBACK FILE RENAME
                console.error('Database update failed, attempting rollback:', dbErr);
                
                try {
                    // Rollback: rename file back to original name
                    await fs.rename(newPath, oldPath);
                    console.log('Successfully rolled back file rename');
                    
                    return rest.sendError(res, 
                        `Unable to update database: ${dbErr.message}. File rename has been rolled back.`
                    );
                    
                } catch (rollbackErr) {
                    // ⚠️ CRITICAL: ROLLBACK FAILED
                    console.error('CRITICAL: Rollback failed. File:', newName, 'DB:', oldName);
                    return rest.sendError(res, `Rollback failed. File: "${newName}", DB: "${oldName}". Manual fix required.`);
                }
            }
            
            // ✅ SUCCESS
            return rest.sendSuccess(res, 'Successfully renamed file to', newName);
        }
        
        // ==========================================
        // USE CASE 2: UPDATE METADATA
        // ==========================================
        else if (req.body.dbdata) {
            // ✅ VALIDATION: Check if _id exists
            if (!req.body.dbdata._id) {
                return rest.sendError(res, 'Asset ID is required');
            }
            
            // ✅ STEP 1: LOAD EXISTING ASSET
            const asset = await Asset.findById(req.body.dbdata._id);
            
            if (!asset) {
                return rest.sendError(res, 'Asset not found');
            }
            
            // ✅ STEP 2: CLEAN AND MERGE DATA
            // Remove fields that should never be updated from client
            delete req.body.dbdata.__v;        // Version key managed by Mongoose
            delete req.body.dbdata._id;        // ID should never change
            delete req.body.dbdata.createdAt;  // Creation timestamp is immutable
            
            // Use Mongoose's set() method (better than Object.assign for Mongoose docs)
            asset.set(req.body.dbdata);
            
            // ✅ STEP 3: SAVE TO DATABASE
            try {
                const data = await asset.save();
                return rest.sendSuccess(res, 'Asset metadata saved successfully', data);
                
            } catch (saveErr) {
                console.error('Error saving asset metadata:', saveErr);
                
                // Check for validation errors
                if (saveErr.name === 'ValidationError') {
                    return rest.sendError(res, 'Validation error', saveErr);
                }
                
                // Check for duplicate key errors
                if (saveErr.code === 11000) {
                    return rest.sendError(res, 'Duplicate value error');
                }
                
                // Generic error
                return rest.sendError(res, `Error saving asset: ${saveErr.message}`);
            }
        }
        
        // ==========================================
        // INVALID REQUEST
        // ==========================================
        else {
            return rest.sendError(res, 'Invalid request: provide either "newname" for rename or "dbdata" for metadata update');
        }
        
    } catch (err) {
        // Catch any unexpected errors
        console.error('Unexpected error in updateAsset:', err);
        return rest.sendError(res, 'Unexpected error updating asset', err);
    }
};




export const createAssetFileFromContent = async (name, data) => {
    const file = path.resolve(config.mediaDir, name);
    await fs.writeFile(file, JSON.stringify(data, null, 4));
};


export const createLinkFile = async (req, res) => {
    try {
        const { details, categories = [] } = req.body;
        
        // Validate input
        if (!details || !details.name || !details.type) {
            return rest.sendError(res, 'Invalid link details: name and type required');
        }
        
        const fileName = `${details.name}${details.type}`;
        const filePath = path.join(config.mediaDir, fileName);
        
        // Step 1: Write file to disk
        await fs.writeFile(filePath, JSON.stringify(details, null, 4), 'utf8');
        
        // Step 2: Store in database (assuming storeLinkDetails will be async)
        await serverAssets.storeLinkDetails(fileName, 'link', categories);
        
        // Success
        return rest.sendSuccess(res, `Link file created for the link as ${fileName}`);
        
    } catch (err) {
        console.error('Error in createLinkFile:', err);
        return rest.sendError(res, 'Error creating link file', err);
    }
};


export const getLinkFileDetails = async (req, res) => {
    try {
        const fileName = req.params.file;
        const filePath = path.join(config.mediaDir, fileName);
        const retData = {};
        
        // Step 1: Read and parse file from disk
        try {
            const fileData = await fs.readFile(filePath, 'utf-8');
            retData.data = JSON.parse(fileData);  // Parse JSON string to object
        } catch (err) {
            return rest.sendError(res, `Unable to read link file: ${err.message}`);
        }
        
        // Step 2: Read database record (non-blocking)
        try {
            retData.dbdata = await Asset.findOne({ name: fileName });
        } catch (err) {
            console.error('Error reading Asset Collection:', err);
            retData.dbdata = null;
        }
        
        // Step 3: Send response
        return rest.sendSuccess(res, 'link file details', retData);
        
    } catch (err) {
        console.error('Error in getLinkFileDetails:', err);
        return rest.sendError(res, 'Error getting link file details', err);
    }
};


export const updatePlaylist = async (req, res) => {
    try {
        await serverAssets.updatePlaylist(req.body.playlist, req.body.assets);
        return rest.sendSuccess(res, 'Playlist updated in assets');
    } catch (err) {
        console.error('Error updating playlist:', err);
        return rest.sendError(res, 'Failed to update playlist in assets', err);
    }
};