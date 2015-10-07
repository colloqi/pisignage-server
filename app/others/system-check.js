var async = require('async'),
	fs = require('fs'),
	config = require('../../config/config'),
	exec = require('child_process').exec;

module.exports = function(){
	var errors = 0;
    async.series([
		function(cb){
			fs.exists(config.mediaDir,function(exists){
				if(!exists){
                    fs.mkdir(config.mediaDir,0777,function (err) {
                        if (err) {
                            console.log('*****************************************************');
                            console.log('*     Unable to create media directory, exiting     *');
                            console.log('*****************************************************\n');
                            process.exit(1);
                        } else {
                            cb()
                        }
                    })
				} else
				    cb();
			})
		},
		function(cb){
			fs.exists(config.thumbnailDir,function(exists){
				if(!exists){
                    fs.mkdir(config.thumbnailDir,0777,function (err) {
                        if (err) {
                            console.log('********************************************************************');
                            console.log('* media/_thumbnails directory absent, thumbnails cannot be created *');
                            console.log('********************************************************************\n');
                            errors++;
                        }
                        cb()
                    })
                } else
				    cb();
			})
		},
		function(cb){
			exec('which ffprobe',function(err,stdout,stderr){
				if(err){
					console.log('****************************************************************');
					console.log('*  Please install ffmpeg, videos cannot be uploaded otherwise  *');
					console.log('****************************************************************\n');
                    errors++;
                }
				cb();
			})
		},
		function(cb){
			exec('which convert',function(err,stdout,stderr){
				if(err){
					console.log('*********************************************************************');
					console.log('* Please install imagemagik, otherwise thumbnails cannot be created *');
					console.log('*********************************************************************\n');
                    errors++;
                }
				cb();
			})
		}
	],function(err){
		console.log('********************************************');
		if (errors)
            console.log('*  system check complete with '+errors+' errors     *');
        else
            console.log('*        system check passed               *');
        console.log('********************************************');
	})
}