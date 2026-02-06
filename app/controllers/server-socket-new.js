import * as players from './players.js';

let iosockets = null;     //holds all the clients io.sockets
let iosocketsWebsocketOnly = null;     //holds all the clients io.sockets


const handleClient = (socket) => {

    //console.log("connection with 2.1.1 socket.io : "+socket.id);
    socket.on('status', (settings, status, priority) => {
        const safeSettings = (settings && typeof settings === 'object') ? settings : {};
        const safeStatus   = (status   && typeof status   === 'object') ? status   : {};
    
        const statusObject = {
            lastReported: Date.now(),
            ip: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address,
            socket: socket.id,
            priority,
            ...safeSettings,
            ...safeStatus
        };
        statusObject.newSocketIo = true;
        players.updatePlayerStatus(statusObject);
    });

    socket.on('secret_ack', (err) => {
        players.secretAck(socket.id, err ? false : true);
    });

    socket.on('shell_ack', (response) => {
        players.shellAck(socket.id, response);
    });

    socket.on('media_ack', (response) => {
        players.playlistMediaAck(socket.id, response);
    });

    socket.on('snapshot', (response) => {
        players.piScreenShot(socket.id, response);
    });

    socket.on('setplaylist_ack', (response) => {
        players.playlistChangeAck(socket.id, response);
    });

    socket.on('upload', (player, filename, data) => {
        players.upload(player, filename, data);
    });

    socket.on('disconnect', (reason) => {
        players.updateDisconnectEvent(socket.id, reason);
    });
};

export const startSIO = (io) => {
    io.sockets.on('connection', handleClient);
    iosockets = io.sockets;
};

export const startSIOWebsocketOnly = (io) => {
    io.sockets.on('connection', handleClient);
    iosocketsWebsocketOnly = io.sockets;
};

export const emitMessage = (sid, ...args) => {
    if (iosockets.sockets[sid]) {
        iosockets.sockets[sid].emit(...args);
    }
};

