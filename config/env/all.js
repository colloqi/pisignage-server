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

    logFile:                rootPath+ "/../forever_out.log",
    logStoreDir:            assetDir+ "/_logs",

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

    filenameRegex:          /[&\/\\#,+()$~%'":*?<>{}]/g,
    groupNameRegEx:         /[&\/\\#,+()$~%'":*?<>{}\^]/g,
    videoRegex: /(mp4|mov|m4v|avi|webm|wmv|flv|mkv|mpg|mpeg|3gp)$/i,
    audioRegex: /(mp3|m4a|mp4a|aac)$/i,
    imageRegex: /(jpg|jpeg|png|gif|bmp)$/i,
    htmlRegex: /\.html$/,
    noticeRegex: /\.html$/,
    zipfileRegex: /(.zip|.gz|.bz2)$/i,
    repofileRegex: /\.repo$/i,
    liveStreamRegex: /\.tv$/i,
    omxStreamRegex:  /\.stream$/i,
    pdffileRegex:           /\.pdf$/i,
    txtFileRegex:           /\.txt$/i,
    linkUrlRegex: /\.link$/i,
    CORSLink:  /\.weblink$/i,
    mediaRss:               /\.mrss$/i,
    radioFileRegex:         /\.radio$/i,
    brandRegex:             /^(brand_intro|brand_intro_portrait)\./i,
    nestedPlaylist:         /^__/i,
    gcalRegex: /\.gcal$/i,
    systemAssets: ["_system_notice.html"]
};
