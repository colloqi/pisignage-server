var async = require('async'),
	fs = require('fs'),
	config = require('../../config/config'),
	exec = require('child_process').exec;

module.exports = function(){
	async.series([
		function(cb){
			fs.exists(config.mediaDir,function(exists){
				if(!exists){
					console.log('********************************************');
					console.log('*       unable to find media directory     *');
					console.log('********************************************\n');
					process.exit(1);
				}
				cb();
			})
		},
		function(cb){
			fs.exists(config.thumbnailDir,function(exists){
				if(!exists){
					console.log('********************************************');
					console.log('*   media/_thumbnails directory absent     *');
					console.log('********************************************\n');

				}
				cb();
			})
		},
		function(cb){
			fs.exists('/usr/local/bin/ffprobe',function(exists){
				if(!exists){
					console.log('********************************************');
					console.log('*             Install ffmpeg               *');
					console.log('********************************************\n');
				}
				cb();
			})
		},
		function(cb){
			exec('which convert',function(err,stdout,stderr){
				if(err){
					console.log('********************************************');
					console.log('*              Install imagemagik          *');
					console.log('********************************************\n');
				}
				cb();
			})
		}
	],function(err){
		console.log('********************************************');
		console.log('*        system check complete             *');
		console.log('********************************************');
	})
}