"use strict" // REMOVE AFTER MIGRATING require TO import statements

// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const WebSocket = require("ws");

// Application Config
const config = require(path.join(__dirname,'/config/config'));

// use JS native promises
mongoose.Promise = global.Promise;

const connectToMongoDB = async () => {
    try {
        await mongoose.connect(config.mongo.uri);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("********************************************");
        console.log("*          MongoDB Process not running     *");
        console.log("********************************************\n");
        
        process.exit(1);    }
};

connectToMongoDB();

//create docker directories if needed
const createDirectory = async (dirPath) => {
    try {
        await fs.promises.mkdir(dirPath);
    } catch (error) {
        if (error.code != "EEXIST") {
            console.log("Error creating logs directory ", error.code);
        }
    }
};

createDirectory(config.releasesDir);
createDirectory(config.licenseDir);
createDirectory(config.syncDir);
createDirectory(config.thumbnailDir);

// check system 
require('./app/others/system-check')();

// Bootstrap models
const modelsPath = path.join(__dirname, "app/models");
const models = fs.readdirSync(modelsPath)

for (const modelFile of models) {
    require(`${modelsPath}/${modelFile}`);
}

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
        key: fs.readFileSync("./pisignage-server-key.pem"),
        cert: fs.readFileSync("./pisignage-server-cert.pem"),
        passphrase: 'pisignage'
        };
    server = require('https').createServer(https_options, app);
}
else {

    server = require('http').createServer(app);
}

var wss = new WebSocket.Server({ server, path:"/websocket" });

require("./app/controllers/socket.js").handleSockets(server, wss);


server.on("upgrade", (request, socket, head) => {
    
    let pathname = request.url;
    console.log({ pathname })

    // TODO: FIND ALTERNATIVE WAY TO HANDLE THIS
    // try {
    //     const fullURL = new URL(request.url);
    //     pathname = fullURL.pathname;
    // } catch (error) {
    //     console.log(`error parsing URL: ${request.url} - ${error}`);
    // }

    if (pathname === "/WebSocket") {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    }

});

require('./app/controllers/scheduler');

server.listen(config.port, () => {
    console.log(`Express server listening on port ${config.port} in ${app.get('env')} mode`);
});

server.on('connection', (socket) => {
    // 60 minutes timeout
    socket.setTimeout(3600000);
});

process.on("uncaughtException", function (err) {
    console.error(`${err.message} - ${err.stack}`)
});

// Expose app
module.exports = app;

