'use strict';

// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express'),
    oldSocketio = require('919.socket.io'),
    socketio = require('socket.io');

var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    fix=require('fix-path'),
    mkdirp = require('mkdirp');
    fix();
var certificatesFound = true;
// Application Config
var config = require(path.join(__dirname,'/config/config'));


// check system 
require('./app/others/system-check')();
// Bootstrap models
var modelsPath = path.join(__dirname, 'app/models');
fs.readdirSync(modelsPath).forEach(function (file) {
    require(modelsPath + '/' + file);
});


var app = express();
var server;
var createServer=function(){
// Express settings
require('./config/express')(app);

// Start server
if (config.https && certificatesFound) {
    var https_options = {
        ca: fs.readFileSync("/home/ec2-user/.ssh/intermediate.crt"),
        key: fs.readFileSync("/home/ec2-user/.ssh/pisignage-server.key"),
        cert: fs.readFileSync("/home/ec2-user/.ssh/pisignage-server.crt")
    };
    server = require('https').createServer(https_options, app);

    //require('http').createServer(app).listen(80);
}
else {
    server = require('http').createServer(app);
}
}
var startServer=function(){
var io = oldSocketio.listen(server);
var ioNew = socketio(server,{
    path: '/newsocket.io',
    serveClient: true,
    // below are engine.IO options
    pingInterval: 45000,
    pingTimeout: 45000,
    upgradeTimeout: 60000,
    maxHttpBufferSize: 10e7
});

//Bootstrap socket.io
require('./app/controllers/server-socket').startSIO(io);
require('./app/controllers/server-socket-new').startSIO(ioNew);

require('./app/controllers/scheduler');

server.listen(config.port, function () {
    console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});

server.on('connection', function(socket) {
    // 60 minutes timeout
    socket.setTimeout(3600000);
});
}

// Expose app
//module.exports = app;

module.exports = {
    initializeServer : function() {

        async.series([
            function(async_cb) {
                //Create media directory if not present
                var neededDirs = [config.mediaDir,config.thumbnailDir,config.dataDir,config.releasesDir,config.licenseDir,config.syncDir,config.dbDir]
                async.eachSeries(neededDirs, function(dir,cb) {

                        mkdirp(dir, function (err) {
                            if (err) {
                                console.log("Error : Could not create " + dir +", error: "+ err);
                            }
                            cb()
                        });
                    }, async_cb
                )
            },
            function (async_cb) {
                //Check for certificates required for HTTPS
                var certFiles = ['https/private_key.cert','https/certificate.cert']
                async.eachSeries(certFiles, function(file,cb) {
                    fs.access(path.join(config.dataDir,file),function(err) {
                        if (err) {
                            certificatesFound = false;
                        }
                        cb();
                    })
                }, async_cb)
            }
        ], function(err){
            if (err) {
                console.log("Error while creating directories, aborting ")
            } else {
                console.log("system check done")
                createServer();
                startServer();
            }
        })
    },
    expressServer : express,
    
    restartServer : function() {
        server.close();
        startServer();
    }
}
