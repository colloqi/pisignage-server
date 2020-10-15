var scheduler = require('node-schedule'),
    dayScheduler;

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    config = require('../../config/config'),
    serverFile = path.join(config.releasesDir,"server-package.json"),
    packageJsonFile = path.join(config.releasesDir,"package.json")

var download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
        console.log("Downloading "+url)
        response.on('data', function(data) {
            process.stdout.write("#");
        })
        .pipe(file)
        file.on('finish', function() {
            console.log("Done")
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest, function(err){}); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};

var checkAndDownloadImage = function() {
    var serverVersion,
        localVersion,
        update = false;
    async.series([
        function(async_cb) {
            //download pisignage.com/releases/package.json
            download("http://pisignage.com/releases/package.json",serverFile, function(err){
                if (err)
                    console.log(err);
                async_cb(err);
            })
        },
        function(async_cb) {
            try {
                var serverdata = fs.readFileSync(serverFile);
                serverVersion = JSON.parse(serverdata).version;
            } catch (e) {
                return async_cb(true)
            }

            fs.stat(packageJsonFile, function(err) {
                if (err)
                    update = true;
                async_cb(err)
            })
        },
        function(async_cb) {
            //read version, different from local one
            try {
                var localData = fs.readFileSync(packageJsonFile)
                localVersion = JSON.parse(localData).version
            } catch (e) {
                return async_cb(true)
            }
            if (serverVersion != localVersion) {
                update = true;
            }
            async_cb()
        },
        function (async_cb) {
            //read version, different from local one
            if (!update) {
                fs.access(path.join(config.releasesDir,"piimage"+serverVersion+"-v14.zip"), (fs.constants || fs).F_OK, function(err) {
                    if (err) {
                        update = true;
                        console.log(err);
                    }
                    async_cb(err)
                });
            } else {
                async_cb()
            }
        }
    ], function(err){
        if (!update)
            return;

        console.log("New version is available: "+serverVersion)
        var serverLink = "http://pisignage.com/releases/piimage"+serverVersion+".zip",
            imageFile = path.join(config.releasesDir,"piimage"+serverVersion+".zip"),
            serverLinkV6 = "http://pisignage.com/releases/piimage"+serverVersion+"-v6.zip",
            imageFileV6 = path.join(config.releasesDir,"piimage"+serverVersion+"-v6.zip"),
            linkFile = path.join(config.releasesDir,"pi-image.zip"),
            linkFileV6 = path.join(config.releasesDir,"pi-image-v6.zip"),
            linkFileV6_2 = path.join(config.releasesDir,("piimage"+serverVersion).slice(0,("piimage"+serverVersion).indexOf(".")) + "-v6.zip"),
            serverLinkV14 = "http://pisignage.com/releases/piimage"+serverVersion+"-v14.zip",
            imageFileV14 = path.join(config.releasesDir,"piimage"+serverVersion+"-v14.zip"),
            linkFileV14 = path.join(config.releasesDir,"pi-image-v14.zip")
        download(serverLink,
            imageFile,
            function (err) {
                if (err) {
                    console.log(err)
                } else {
                    download(serverLinkV6,
                        imageFileV6, function (err) {
                            if (err) {
                                console.log(err)
                            } else {
                                download(serverLinkV14,
                                    imageFileV14, function (err) {
                                        if (err){
                                            console.log(err);
                                        } else {
                                            //create the symbolic link pi-image.zip to the the donwloaded zip file
                                            fs.unlink(linkFile, function (err) {
                                                fs.symlink(imageFile, linkFile, function (err) {
                                                    if (err) console.log(err)
                                                })
                                            })
                                            fs.unlink(linkFileV6, function (err) {
                                                fs.symlink(imageFileV6, linkFileV6, function (err) {
                                                    if (err) console.log(err)
                                                })
                                            })
                                            fs.unlink(linkFileV6_2, function (err) {
                                                fs.symlink(imageFileV6, linkFileV6_2, function (err) {
                                                    if (err) console.log(err)
                                                })
                                            })
                                            fs.unlink(linkFileV14, function (err) {
                                                fs.symlink(imageFileV14, linkFileV14, function (err) {
                                                    if (err) console.log(err);
                                                });
                                            });
                                            // update local package.json with the downloaded one
                                            fs.unlink(packageJsonFile, function (err) {
                                                fs.rename(serverFile, packageJsonFile, function (err) {
                                                    if (err) console.log(err)
                                                })
                                            })
                                            console.log("piSignage image updated to " + serverVersion);
                                        }
                                    })

                            }
                        })
                }
            })
    })
}

dayScheduler = scheduler.scheduleJob({hour:00,minute:00}, checkAndDownloadImage);
checkAndDownloadImage();

