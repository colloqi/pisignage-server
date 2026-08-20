import scheduler from 'node-schedule';
import http from 'http';
import https from 'https';
import fs from 'fs/promises'; // Using promises version for modern async/await
import path from 'path';
import config from '../../config/config.js';
import fsSync from 'fs';

let dayScheduler;
let updateInProgress = false;

const serverFile = path.join(config.releasesDir, "server-package.json");
const serverFile_p2 = path.join(config.releasesDir, "server-package-p2.json");
const packageJsonFile_p2 = path.join(config.releasesDir, "package-p2.json");
const packageJsonFile = path.join(config.releasesDir, "package.json");

const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes per file
const MAX_REDIRECTS = 5;

const download = (url, dest, redirects = 0) => {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        // Write to a temp file and rename on success, so a killed or failed
        // download never leaves a partial file under the final name
        const tmpDest = dest + '.download';

        const request = proto.get(url, (response) => {
            const { statusCode, headers } = response;

            if (statusCode >= 300 && statusCode < 400 && headers.location) {
                response.resume();
                if (redirects >= MAX_REDIRECTS) {
                    return reject(new Error(`Too many redirects for ${url}`));
                }
                return resolve(download(headers.location, dest, redirects + 1));
            }

            if (statusCode !== 200) {
                response.resume();
                return reject(new Error(`Download failed for ${url}: HTTP ${statusCode}`));
            }

            console.log(`Downloading ${url}`);
            const file = fsSync.createWriteStream(tmpDest);

            const fail = (err) => {
                file.destroy();
                fsSync.unlink(tmpDest, () => {});
                reject(new Error(`Download failed for ${url}: ${err.message}`));
            };
            file.on('error', fail);
            response.on('error', fail);

            response.pipe(file);

            file.on('finish', () => {
                file.close(async (err) => {
                    if (err) return fail(err);
                    try {
                        await fs.rename(tmpDest, dest);
                        console.log(`Downloaded ${path.basename(dest)}`);
                        resolve();
                    } catch (e) {
                        fail(e);
                    }
                });
            });
        });

        request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
            request.destroy(new Error('timed out'));
        });
        request.on('error', (err) => {
            fsSync.unlink(tmpDest, () => {});
            reject(new Error(`Download failed for ${url}: ${err.message}`));
        });
    });
};

const fileExists = async (file) => {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
};

// Download only if the file is not already present, so restarts and
// re-runs never re-fetch images that were already downloaded
const downloadIfMissing = async (url, dest) => {
    if (await fileExists(dest)) {
        return false;
    }
    await download(url, dest);
    return true;
};

const checkAndDownloadImage = async () => {
    if (updateInProgress) {
        console.log('Image update already in progress, skipping this run');
        return;
    }
    updateInProgress = true;

    let serverVersion, localVersion, serverVersion_p2, localVersion_p2;

    try {
        // Phase 1: Download version files (parallel for speed)
        console.log('Checking for updates...');
        await Promise.all([
            download("http://pisignage.com/releases/package.json", serverFile),
            download("http://pisignage.com/releases/package-p2.json", serverFile_p2)
        ]);

        // Phase 2: Parse server versions
        try {
            const serverdata = await fs.readFile(serverFile, 'utf-8');
            serverVersion = JSON.parse(serverdata).version;

            const serverdata_p2 = await fs.readFile(serverFile_p2, 'utf-8');
            serverVersion_p2 = JSON.parse(serverdata_p2).version;
        } catch (e) {
            console.error('Failed to parse server version files:', e);
            return;
        }
        if (!serverVersion || !serverVersion_p2) {
            console.error('Server version files did not contain a version, skipping update');
            return;
        }

        // Phase 3: Read local versions (if present)
        try {
            const localData = await fs.readFile(packageJsonFile, 'utf-8');
            localVersion = JSON.parse(localData).version;

            const localData_p2 = await fs.readFile(packageJsonFile_p2, 'utf-8');
            localVersion_p2 = JSON.parse(localData_p2).version;
        } catch (e) {
            // Missing or unparsable local files simply mean an update is needed
        }

        // Define all file paths
        const serverLink = `http://pisignage.com/releases/piimage${serverVersion}.zip`;
        const imageFile = path.join(config.releasesDir, `piimage${serverVersion}.zip`);

        const serverLinkV6 = `http://pisignage.com/releases/piimage${serverVersion}-v6.zip`;
        const imageFileV6 = path.join(config.releasesDir, `piimage${serverVersion}-v6.zip`);
        const linkFileV6 = path.join(config.releasesDir, "pi-image-v6.zip");
        const linkFileV6_2 = path.join(
            config.releasesDir,
            `piimage${serverVersion}`.slice(0, `piimage${serverVersion}`.indexOf(".")) + "-v6.zip"
        );

        const serverLinkV14 = `http://pisignage.com/releases/piimage${serverVersion}-v14.zip`;
        const imageFileV14 = path.join(config.releasesDir, `piimage${serverVersion}-v14.zip`);
        const linkFileV14 = path.join(config.releasesDir, "pi-image-v14.zip");
        const linkFile = path.join(config.releasesDir, "pi-image.zip");

        const serverLink_p2 = `http://pisignage.com/releases/piimage${serverVersion_p2}-p2-v14.zip`;
        const imageFile_p2 = path.join(config.releasesDir, `piimage${serverVersion_p2}-p2-v14.zip`);
        const linkFile_p2 = path.join(config.releasesDir, "pi-image-p2-v14.zip");

        const serverLink_p2_v20 = `http://pisignage.com/releases/piimage${serverVersion_p2}-p2-v20.zip`;
        const imageFile_p2_v20 = path.join(config.releasesDir, `piimage${serverVersion_p2}-p2-v20.zip`);
        const linkFile_p2_v20 = path.join(config.releasesDir, "pi-image-p2-v20.zip");

        const images = [
            [serverLink, imageFile],
            [serverLinkV6, imageFileV6],
            [serverLinkV14, imageFileV14],
            [serverLink_p2, imageFile_p2],
            [serverLink_p2_v20, imageFile_p2_v20]
        ];

        // Phase 4: Determine whether anything needs doing
        let allImagesPresent = true;
        for (const [, dest] of images) {
            if (!(await fileExists(dest))) {
                allImagesPresent = false;
                break;
            }
        }

        const versionsMatch =
            serverVersion === localVersion && serverVersion_p2 === localVersion_p2;

        if (versionsMatch && allImagesPresent) {
            console.log('Already up to date');
            return;
        }

        // Phase 5: Download only the images that are missing (sequentially,
        // they're large files)
        console.log(`New version is available: ${serverVersion}`);
        for (const [url, dest] of images) {
            await downloadIfMissing(url, dest);
        }

        // Helper function to safely create symlink
        const createSymlink = async (target, link) => {
            try {
                await fs.unlink(link).catch(() => {}); // Remove old link if exists
                await fs.symlink(target, link);
            } catch (err) {
                console.error(`Failed to create symlink ${link}:`, err);
            }
        };

        // Create all symbolic links (can run in parallel)
        await Promise.all([
            createSymlink(imageFile, linkFile),
            createSymlink(imageFileV6, linkFileV6),
            createSymlink(imageFileV6, linkFileV6_2),
            createSymlink(imageFileV14, linkFileV14),
            createSymlink(imageFile_p2, linkFile_p2),
            createSymlink(imageFile_p2_v20, linkFile_p2_v20)
        ]);

        // Update local package.json files only after all downloads succeeded
        await fs.unlink(packageJsonFile).catch(() => {});
        await fs.rename(serverFile, packageJsonFile);
        console.log(`piSignage image updated to ${serverVersion}`);

        await fs.unlink(packageJsonFile_p2).catch(() => {});
        await fs.rename(serverFile_p2, packageJsonFile_p2);
        console.log(`player 2 image updated to ${serverVersion_p2}`);

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        updateInProgress = false;
    }
};

// Schedule to run daily at midnight (00:00)
dayScheduler = scheduler.scheduleJob({ hour: 0, minute: 0 }, checkAndDownloadImage);

// Run a few minutes after startup — a server stuck in a restart loop dies
// before this fires, so it never hits pisignage.com on every restart
setTimeout(checkAndDownloadImage, 5 * 60 * 1000);
