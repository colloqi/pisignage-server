// Default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// ES6 imports
import express from 'express';
import oldSocketio from '919.socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as urlParse } from 'url';
import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import { readFileSync, writeSync } from 'fs';
import { startSIO as startSIOOld, emitMessage as emitMessageOld } from './app/controllers/server-socket.js';
import { startSIO as startSIONew, startSIOWebsocketOnly, emitMessage as emitMessageNew } from './app/controllers/server-socket-new.js';
import { startSIO as startSIOWebSocket, emitMessage as emitMessageWS } from './app/controllers/server-socket-ws.js';

// Get __dirname equivalent in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Application Config
const config = (await import(path.join(__dirname, '/config/config.js'))).default;

// Connect to database (Mongoose 8 - uses async/await, no callbacks)
try {
    await mongoose.connect(config.mongo.uri);
    // Optional: Add success log if you want
    console.log('MongoDB connected successfully');
} catch (error) {
    console.log('********************************************');
    console.log('*          MongoDB Process not running     *');
    console.log('********************************************\n');
    
    process.exit(1);
}
//create docker directories if needed
const createDirectoryIfNotExists = async (dir, dirName = 'directory') => {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            console.log(`Error creating ${dirName}, ${err.code}`);
        }
    }
};

await createDirectoryIfNotExists(config.releasesDir, 'releases directory');
await createDirectoryIfNotExists(config.licenseDir, 'license directory');
await createDirectoryIfNotExists(config.syncDir, 'sync directory');
await createDirectoryIfNotExists(config.thumbnailDir, 'thumbnail directory');



// Check system
import systemCheck from './app/others/system-check.js';
await systemCheck();

// Bootstrap models
const modelsPath = path.join(__dirname, 'app/models');
const modelFiles = await fs.readdir(modelsPath);

for (const file of modelFiles) {
    // Import each model file (this registers the model with Mongoose)
    await import(`${modelsPath}/${file}`);
}

console.log('********************************************************************');
console.log('*    After update if you do not see your groups, please change     *');
console.log('*    change the uri variable to "mongodb://localhost/pisignage-dev"*');
console.log('*    in config/env/development.js and restart the server           *');
console.log('******************************************************************\n');

const app = express();

// Express settings
const configureExpress = (await import('./config/express.js')).default;
configureExpress(app);

// Start server
let server;
if (config.https) {
    const https_options = {
        key: readFileSync("./pisignage-server-key.pem"),
        cert: readFileSync("./pisignage-server-cert.pem"),
        passphrase: 'pisignage'
    };
    server = https.createServer(https_options, app);
} else {
    server = http.createServer(app);
}

const io = oldSocketio.listen(server, { 'destroy upgrade': false });
const ioNew = new SocketIOServer(server, {
    path: '/newsocket.io',
    serveClient: true,
    // below are engine.IO options
    pingInterval: 45000,
    pingTimeout: 45000,
    upgradeTimeout: 60000,
    maxHttpBufferSize: 10e7
});

const ioNewWebsocketOnly = new SocketIOServer(server, {
    path: "/wssocket.io",
    serveClient: true,
    // below are engine.IO options
    pingInterval: 45000,
    pingTimeout: 180000,
    upgradeTimeout: 180000,
    maxHttpBufferSize: 10e7
});





    // Bootstrap socket.io
startSIOOld(io);
startSIONew(ioNew);
startSIOWebsocketOnly(ioNewWebsocketOnly);

// Bootstrap WebSocket
const wss = new WebSocketServer({ server, path: "/websocket" });
startSIOWebSocket(wss);

server.on('upgrade', (request, socket, head) => {
    const pathname = urlParse(request.url).pathname;
    if (pathname === '/WebSocket') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
});

// Import scheduler
await import('./app/controllers/scheduler.js');

server.listen(config.port, () => {
    console.log('Express server listening on port %d in %s mode', config.port, app.get('env'));
});

server.on('connection', (socket) => {
    // 60 minutes timeout
    socket.setTimeout(3600000);
});

server.on('error', (err) => {
    console.log("caught ECONNRESET error 1");
    console.log(err);
});

io.on('error', (err) => {
    console.log("caught ECONNRESET error 2");
    console.log(err);
});

io.sockets.on('error', (err) => {
    console.log("caught ECONNRESET error 3");
    console.log(err);
});

ioNew.on('error', (err) => {
    console.log("caught ECONNRESET error 4");
    console.log(err);
});

ioNew.sockets.on('error', (err) => {
    console.log("caught ECONNRESET error 5");
    console.log(err);
});

process.on('uncaughtException', (err, origin) => {
    writeSync(
        process.stderr.fd,
        `***WARNING***  Caught exception: ${err}, Exception origin: ${origin}*******\n`
    );
});

// Expose app
export default app;