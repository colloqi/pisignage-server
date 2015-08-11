var fs = require('fs'),
	path = require('path'),
	async = require('async');

var	config = require('../../config/config');
	rest = require('./restware');

exports.saveLicense = function(req,res){ // save license files
	var uploadedFiles = req.files["assets"],
		savedFiles = [];
		
	async.each(uploadedFiles,function(file,callback){
		fs.rename(file.path,path.join(config.licenseDir, file.originalname),function(err){
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

exports.getList = function(req,res){ // return all license file in /license
	
	getTxtFiles(function(err,files){
		if(err)
			return rest.sendError(res,'error in reading license directory',err);
		
		return rest.sendSuccess(res,'total license list ',files);
	})
};

exports.deleteLicense = function(req,res){ // delete particular license and return new file list
	var deleteFile = req.params['filename'];
	fs.unlink(config.licenseDir+deleteFile,function(err){
		if(err)
			return rest.sendError(res,"License "+deleteFile+" can't be deleted",err);
		
		getTxtFiles(function(err,files){ // get all license
			if(err)
				return rest.sendError(res,'error in reading license directory',err);

			return rest.sendSuccess(res,"License "+deleteFile+" deleted successfuly",files);
		});
	})
}

function getTxtFiles(cb){ // get all .txt files in license directory
	var txtOnly; 
	fs.readdir(config.licenseDir,function(err,files){
		if(err)
			return cb(err,null);
		txtOnly = files.filter(function(file){
			return file.match(/\.txt$/i)  // remove dot, hidden system files
		});
		cb(null,txtOnly);
	})
}