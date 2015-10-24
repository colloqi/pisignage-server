'use strict;'

var fs = require('fs'),
	path = require('path'),
	async = require('async'),
    _ = require('lodash');

var	config = require('../../config/config'),
	rest = require('../others/restware');

var mongoose = require('mongoose'),
    Settings = mongoose.model('Settings')

var licenseDir = config.licenseDirPath

var getTxtFiles = function(cb){
    var txtOnly;
    fs.readdir(licenseDir,function(err,files){
        if(err)
            return cb(err,null);
        txtOnly = files.filter(function(file){
            return file.match(/\.txt$/i)  // remove dot, hidden system files
        });
        cb(null,txtOnly);
    })
}

exports.index = function(req,res){

    getTxtFiles(function(err,files){
        if(err)
            return rest.sendError(res,'error in reading license directory',err);

        return rest.sendSuccess(res,'total license list ',files);
    })
};

exports.saveLicense = function(req,res){ // save license files
	var uploadedFiles = req.files["assets"],
		savedFiles = [];
		
	async.each(uploadedFiles,function(file,callback){
		fs.rename(file.path,path.join(licenseDir, file.originalname),function(err){
			if(err)
				return callback(err);
			savedFiles.push({name: file.originalname , size: file.size});
			callback();
		});
	},function(err){
		if(err)
			return rest.sendError(res,'Error in saving license ',err);
		return rest.sendSuccess(res,'License saved successfuly',savedFiles);
	})
};



exports.deleteLicense = function(req,res){ // delete particular license and return new file list
	fs.unlink(path.join(licenseDir,req.params['filename']),function(err){
		if(err)
			return rest.sendError(res,"License "+req.params['filename']+" can't be deleted",err);
		
		getTxtFiles(function(err,files){ // get all license
			if(err)
				return rest.sendError(res,'error in reading license directory',err);

			return rest.sendSuccess(res,"License "+req.params['filename']+" deleted successfuly",files);
		});
	})
}

exports.getConfig = function(req,res) {
    return rest.sendSuccess(res,"Config Data",{
        assetLogEnable: config.assetLogEnable,
        newLayoutsEnable: config.newLayoutsEnable
    });
}


exports.getSettingsModel = function(cb) {
    Settings.findOne(function (err, settings) {
        if (err || !settings) {
            settings = new Settings();
            settings.save(cb);
        } else {
            cb(null,settings);
        }
    })
}

exports.getSettings = function(req,res) {
    exports.getSettingsModel(function (err, data) {
        if (err) {
            return rest.sendError(res, 'Unable to access Settings', err);
        } else {
            return rest.sendSuccess(res, 'Settings', data);
        }
    })
}

exports.updateSettings = function(req,res) {
    var restart;
    Settings.findOne(function (err, settings) {
        if (err)
            return rest.sendError(res, 'Unable to update Settings', err);

        if (settings.installation != req.body.installation)
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
            if (restart)  {
                console.log("restarting server")
                require('child_process').fork(require.main.filename);
                process.exit(0);
            }
        });
    })
}

exports.getSettingsModel(function(err,settings){
    licenseDir = config.licenseDirPath+(settings.installation || "local")
})

