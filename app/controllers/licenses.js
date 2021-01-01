'use strict;'

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    exec = require('child_process').exec,
    _ = require('lodash'),
    CryptoJS = require('crypto-js');


var serverIp = require('ip').address();

var config = require('../../config/config'),
    rest = require('../others/restware');

var mongoose = require('mongoose'),
    Settings = mongoose.model('Settings'),
    settingsModel = null;

var licenseDir = config.licenseDirPath

var getTxtFiles = function (cb) {
    var txtOnly;
    fs.readdir(licenseDir, function (err, files) {
        if (err)
            return cb(err, null);
        txtOnly = files.filter(function (file) {
            return file.match(/\.txt$/i)  // remove dot, hidden system files
        });
        cb(null, txtOnly);
    })
}

var tryGenerateLicense = function (playerId, siteName, cb) {
    var licenseInfo = {
        enabled: true,
        generatedOn: new Date().toISOString(),
        validity: 0,
        installation: siteName,
        domain: null
    };
    // NOTE: their epic secret key
    var secret = "pisignageLangford";
    var encryptionCode = CryptoJS.HmacSHA1(playerId, secret).toString(CryptoJS.enc.Hex);
    var licenseContent = CryptoJS.AES.encrypt(JSON.stringify(licenseInfo), encryptionCode).toString();

    // Generate license file
    fs.writeFile(path.join(licenseDir, 'license_' + playerId + '.txt'), licenseContent, function (err) {
        if (err) {
            console.log(err);
            return cb(false);
        }
        console.log("The license file was created!");
        return cb(true);
    });
}
exports.index = function (req, res) {

    getTxtFiles(function (err, files) {
        if (err)
            return rest.sendError(res, 'error in reading license directory', err);

        return rest.sendSuccess(res, 'total license list ', files);
    })
};

exports.saveLicense = function (req, res) { // save license files
    var uploadedFiles = req.files["assets"],
        savedFiles = [];

    async.each(uploadedFiles, function (file, callback) {
        fs.rename(file.path, path.join(licenseDir, file.originalname), function (err) {
            if (err)
                return callback(err);
            savedFiles.push({ name: file.originalname, size: file.size });
            callback();
        });
    }, function (err) {
        if (err)
            return rest.sendError(res, 'Error in saving license ', err);
        return rest.sendSuccess(res, 'License saved successfuly', savedFiles);
    })
};



exports.deleteLicense = function (req, res) { // delete particular license and return new file list
    fs.unlink(path.join(licenseDir, req.params['filename']), function (err) {
        if (err)
            return rest.sendError(res, "License " + req.params['filename'] + " can't be deleted", err);

        getTxtFiles(function (err, files) { // get all license
            if (err)
                return rest.sendError(res, 'error in reading license directory', err);

            return rest.sendSuccess(res, "License " + req.params['filename'] + " deleted successfuly", files);
        });
    })
}

exports.generateLicense = function (req, res) { // generate new license
    tryGenerateLicense(req.body.playerId, req.body.siteName, function (isSuccess) {
        return isSuccess
            ? rest.sendSuccess(res, "License was generated for player " + req.body.playerId)
            : rest.sendError(res, "Error while generating license for " + req.body.playerId);
    });
}

exports.getSettingsModel = function (cb) {
    Settings.findOne(function (err, settings) {
        if (err || !settings) {
            if (settingsModel) {
                cb(null, settingsModel)
            } else {
                settingsModel = new Settings();
                settingsModel.save(cb);
            }
        } else {
            cb(null, settings);
        }
    })
}

exports.getSettings = function (req, res) {
    exports.getSettingsModel(function (err, data) {
        if (err) {
            return rest.sendError(res, 'Unable to access Settings', err);
        } else {
            var obj = data.toObject()
            obj.serverIp = serverIp;
            exec('git log -1 --format=%cd;git rev-parse HEAD', function (err, stdout, stderr) {
                if (err || stderr) {
                    obj.date = 'N/A';
                    obj.version = 'N/A';
                } else {
                    stdout = stdout.trim().split('\n');
                    obj.date = [stdout[0].split(' ')[1], stdout[0].split(' ')[2], stdout[0].split(' ')[4]].join(' ');
                    obj.version = stdout[1].slice(0, 6);
                }
                return rest.sendSuccess(res, 'Settings', obj);
            });
        }
    })
}

exports.updateSettings = function (req, res) {
    var restart;
    Settings.findOne(function (err, settings) {
        if (err)
            return rest.sendError(res, 'Unable to update Settings', err);

        //if (settings.installation != req.body.installation)
        restart = true;
        if (settings)
            settings = _.extend(settings, req.body)
        else
            settings = new Settings(req.body);
        settings.save(function (err, data) {
            if (err) {
                rest.sendError(res, 'Unable to update Settings', err);
            } else {
                rest.sendSuccess(res, 'Settings Saved', data);
            }
            if (restart) {
                console.log("restarting server")
                require('child_process').fork(require.main.filename);
                process.exit(0);
            }
        });
    })
}

exports.getSettingsModel(function (err, settings) {
    licenseDir = config.licenseDirPath + (settings.installation || "local")
})

