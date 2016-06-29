'use strict';

//installation and authCredentials has been moved to db, configure at settings tab
var path = require('path');

var rootPath = process.cwd(),
    dataDir = path.join(rootPath, '/data'),
    assetDir = path.join(rootPath, '/../media');

module.exports = {
    root: rootPath,
    dataDir: dataDir,
    releasesDir: dataDir+'/releases',

    uploadDir: assetDir,
    licenseDir: dataDir+'/licenses',
    licenseDirPath: dataDir+'/licenses/',

    syncDir: path.join(dataDir, '/sync_folders'),
    syncDirPath: path.join(dataDir, '/sync_folders/'),

    viewDir: path.join(rootPath, '/app/views'),
    mediaDir: assetDir,
    mediaPath: assetDir + '/',
    thumbnailDir: assetDir + '/_thumbnails',
    
    defaultPlaylist: "default",

    mongo: {
        options: {
            db: {
                safe: true
            }
        }
    },
    session: {
        secret: 'piSignage'
    },

    videoRegex: /(mp4|mov|m4v|avi|webm|wmv|flv|mkv)$/i,
    audioRegex: /(mp3)$/i,
    imageRegex: /(jpg|jpeg|png|gif)$/i,
    htmlRegex: /\.html$/,
    zipfileRegex: /(.zip|.gz|.bz2)/i,
    repofileRegex: /\.repo/i,
    liveStreamRegex: /\.tv/i,
    linkUrlRegex: /\.link/i,
    CORSLink:  /\.weblink/i,
    gcalRegex: /\.gcal/i,
    gCalendar: {
        CLIENT_ID: '',
        CLIENT_SECRET: '',
        REDIRECT_URL: '',
        REDIRECT_BASE_URL: ''
    },
    systemAssets: ["_system_notice.html"]
};
