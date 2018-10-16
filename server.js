'use strict';

// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var express = require('express'),
    oldSocketio = require('919.socket.io'),
    socketio = require('socket.io'),
    mongoose= require('mongoose');

var path = require('path'),
    fs = require('fs');

// Application Config
var config = require(path.join(__dirname,'/config/config'));

// Connect to database
var db = mongoose.connect(config.mongo.uri, config.mongo.options);

db.connection.on('error',function(){
    console.log('********************************************');
    console.log('*          MongoDB Process not running     *');
    console.log('********************************************\n');

    process.exit(1);
})

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


// Expose app
module.exports = app;

