import fs from 'fs/promises';
import config from '../../config/config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function systemCheck() {
    let errors = 0;

    // Check 1: Create media directory if it doesn't exist
    try {
        await fs.access(config.mediaDir);
        // Directory exists, do nothing
    } catch (err) {
        // Directory doesn't exist, create it
        try {
            await fs.mkdir(config.mediaDir, { recursive: true, mode: 0o777 });
        } catch (mkdirErr) {
            console.log('*****************************************************');
            console.log('*     Unable to create media directory, exiting     *');
            console.log('*****************************************************\n');
            process.exit(1);
        }
    }

    // Check 2: Create thumbnail directory if it doesn't exist
    try {
        await fs.access(config.thumbnailDir);
        // Directory exists, do nothing
    } catch (err) {
        // Directory doesn't exist, create it
        try {
            await fs.mkdir(config.thumbnailDir, { recursive: true, mode: 0o777 });
        } catch (mkdirErr) {
            console.log('********************************************************************');
            console.log('* media/_thumbnails directory absent, thumbnails cannot be created *');
            console.log('********************************************************************\n');
            errors++;
        }
    }

    // Check 3: Verify ffmpeg AND ffprobe are installed (they ship together, but
    // check both — ffmpeg does the transcode, ffprobe reads metadata).
    try {
        await execAsync('ffmpeg -version');
        await execAsync('ffprobe -version');
    } catch (err) {
        console.log('****************************************************************');
        console.log('*  Please install ffmpeg, videos cannot be uploaded otherwise  *');
        console.log('****************************************************************\n');
        console.log(err);
        errors++;
    }

    // Check 4: Verify ImageMagick is installed
    try {
        await execAsync('convert -version');
    } catch (err) {
        console.log('*********************************************************************');
        console.log('* Please install imagemagik, otherwise thumbnails cannot be created *');
        console.log('*********************************************************************\n');
        console.log(err);
        errors++;
    }

    // Summary
    console.log('********************************************');
    if (errors) {
        console.log(`*  system check complete with ${errors} errors     *`);
    } else {
        console.log('*        system check passed               *');
    }
    console.log('********************************************');
}