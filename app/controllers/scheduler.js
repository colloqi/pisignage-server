var scheduler = require('node-schedule'),
    dayScheduler;

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
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
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};

var checkAndDownloadImage = function() {
    //download pisignage.com/releases/package.json
    download("http://pisignage.com/releases/package.json",serverFile, function(err){
        if (err)
            console.log(err);
        //read version, different from local one
        try {
            var serverdata = fs.readFileSync(serverFile),
                localData = fs.readFileSync(packageJsonFile)
            var serverVersion = JSON.parse(serverdata).version,
                localVersion = JSON.parse(localData).version
        } catch(e) {
            return;
        }
        if (serverVersion == localVersion) {
            return;
        }
        console.log("New version is available: "+serverVersion)
        var serverLink = "http://pisignage.com/releases/piimage"+serverVersion+".zip",
            imageFile = path.join(config.releasesDir,"piimage"+serverVersion+".zip"),
            linkFile = path.join(config.releasesDir,"pi-image.zip")
        download(serverLink,
            imageFile,
            function(err) {
                if (err) {
                    console.log(err)
                } else {
                    //create the symbolic link pi-image.zip to the the donwloaded zip file
                    fs.unlinkSync(linkFile)
                    fs.symlinkSync(imageFile,linkFile)
                    // update local package.json with the downloaded one
                    fs.unlinkSync(packageJsonFile)
                    fs.renameSync(serverFile,packageJsonFile)
                    console.log("piSignage image updated to "+serverVersion);
                }
            })
    })
}

dayScheduler = scheduler.scheduleJob({hour:00,minute:00}, checkAndDownloadImage);
checkAndDownloadImage();

