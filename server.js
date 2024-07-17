"use strict"; // REMOVE AFTER MIGRATING require TO import statements

// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const express = require("express"),
    mongoose = require("mongoose"),
    path = require("path"),
    fs = require("fs"),
    WebSocket = require("ws");

/* LOAD APPLICATION CONFIG -------------------------------------------- */
const config = require(path.join(__dirname, "/config/config"));

/* USE JS NATIVE PROMISES IN MONGOOSE --------------------------------- */
mongoose.Promise = global.Promise;

/* MONGOOSE TO MONGODB CONNECTION */
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(config.mongo.uri, {
            // https://chatgpt.com/share/417f92e5-3855-4f31-8664-0d156b0890bd
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("********************************************");
        console.log("*          MongoDB Process not running     *");
        console.log("********************************************\n");

        process.exit(1);
    }
};

connectToMongoDB();

/* CREATE DOCKER DIRS IF NEEDED -------------------------------------- */
const createDirectory = async (dirPath) => {
    try {
        await fs.promises.mkdir(dirPath);
    } catch (error) {
        if (error.code != "EEXIST") {
            console.log("Error creating logs directory ", error);
        }
    }
};

createDirectory(config.releasesDir);
createDirectory(config.licenseDir);
createDirectory(config.syncDir);
createDirectory(config.thumbnailDir);

/* SYSTEM CHECK ------------------------------------------------------ */
require("./app/others/system-check")();

/* LOAD MONGOOSE MODELS ---------------------------------------------- */
const modelsPath = path.join(__dirname, "app/models");
const models = fs.readdirSync(modelsPath);

for (const modelFile of models) {
    require(`${modelsPath}/${modelFile}`);
}

console.log(
    "********************************************************************"
);
console.log(
    "*    After update if you do not see your groups, please change     *"
);
console.log(
    '*    change the uri variable to "mongodb://localhost/pisignage-dev"*'
);
console.log(
    "*    in config/env/development.js and restart the server           *"
);
console.log(
    "******************************************************************\n"
);

/* LOAD EXPRESS -------------------------------------------------------- */
const app = express();

// Express settings
require("./config/express")(app);

/* SERVER OPERATIONS -------------------------------------------------------- */
let server;
if (config.https) {
    const https_options = {
        key: fs.readFileSync("./pisignage-server-key.pem"),
        cert: fs.readFileSync("./pisignage-server-cert.pem"),
        passphrase: "pisignage",
    };
    server = require("https").createServer(https_options, app);
} else {
    server = require("http").createServer(app);
}

const wss = new WebSocket.Server({ server, path: "/websocket" });

require("./app/controllers/socket.js").handleSockets(server, wss);

server.on("upgrade", (request, socket, head) => {
    let pathname = request.url;

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

require("./app/controllers/scheduler");

server.listen(config.port, () => {
    console.log(
        `Express server listening on port ${config.port} in ${app.get(
            "env"
        )} mode`
    );
});

server.on("connection", (socket) => {
    // 60 minutes timeout
    socket.setTimeout(3600000);
});

/* GLOBAL ERROR HANDLING --------------------------------------------------- */

process.on("uncaughtException", (err) => {
    console.error(`${err.message} - ${err.stack}`);
});

// Expose app
module.exports = app;
