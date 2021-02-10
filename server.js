'use strict';

// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express'),
    oldSocketio = require('919.socket.io'),
    socketio = require('socket.io'),
    WebSocket = require('ws'),
    mongoose= require('mongoose');

var path = require('path'),
    url = require('url'),
    fs = require('fs');

// Application Config
var config = require(path.join(__dirname,'/config/config'));

// Connect to database
mongoose.Promise = global.Promise;
mongoose.connect(config.mongo.uri, config.mongo.options,function(error){
    if (error) {
        console.log('********************************************');
        console.log('*          MongoDB Process not running     *');
        console.log('********************************************\n');

        process.exit(1);
    }
});
//create docker directories if needed
fs.mkdir(config.releasesDir, function(err) {
    if (err && (err.code != 'EEXIST')) {
        console.log("Error creating logs directory, "+err.code)
    }
});
fs.mkdir(config.licenseDir, function(err) {
    if (err && (err.code != 'EEXIST')) {
        console.log("Error creating logs directory, "+err.code)
    }
});
fs.mkdir(config.syncDir, function(err) {
    if (err && (err.code != 'EEXIST')) {
        console.log("Error creating logs directory, "+err.code)
    }
});
fs.mkdir(config.thumbnailDir, function(err) {
    if (err && (err.code != 'EEXIST')) {
        console.log("Error creating logs directory, "+err.code)
    }
});



// check system 
require('./app/others/system-check')();
// Bootstrap models
var modelsPath = path.join(__dirname, 'app/models');
fs.readdirSync(modelsPath).forEach(function (file) {
    require(modelsPath + '/' + file);
});

console.log('********************************************************************');
console.log('*    After update if you do not see your groups, please change     *');
console.log('*    change the uri variable to "mongodb://localhost/pisignage-dev"*');
console.log('*    in config/env/development.js and restart the server           *');
console.log('******************************************************************\n');


var app = express();

// Express settings
require('./config/express')(app);

// Start server
var server;
if (config.https) {
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

var io = oldSocketio.listen(server,{'destroy upgrade':false});
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
var wss = new WebSocket.Server({server:server,path:"/websocket"});
require("./app/controllers/server-socket-ws").startSIO(wss);
            server.on('upgrade', function upgrade(request, socket, head) {
                var pathname = url.parse(request.url).pathname;
                if (pathname === '/WebSocket') {
                    wss.handleUpgrade(request, socket, head, function done(ws) {
                        wss.emit('connection', ws, request);
                    });
                }
            });

require('./app/controllers/scheduler');

server.listen(config.port, function () {
    console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});

server.on('connection', function(socket) {
    // 60 minutes timeout
    socket.setTimeout(3600000);
});
server.on('error', function (err) {console.log("caught ECONNRESET error 1");console.log(err)});
io.on('error', function (err) {console.log("caught ECONNRESET error 2");console.log(err)});
io.sockets.on('error', function (err) {console.log("caught ECONNRESET error 3");console.log(err)});
ioNew.on('error', function (err) {console.log("caught ECONNRESET error 4");console.log(err)});
ioNew.sockets.on('error', function (err) {console.log("caught ECONNRESET error 5");console.log(err)});
process.on('uncaughtException', function(err, origin) {
    fs.writeSync(
        process.stderr.fd,
        '***WARNING***  Caught exception: '+err+', Exception origin: '+origin + '*******\n'
    );
})

// Expose app
module.exports = app;

