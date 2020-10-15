'use strict';

var iosockets = null;     //holds all the clients io.sockets

var players = require('./players'),
    _ = require('lodash');

var handleClient = function (socket) {

    //console.log("connection with 2.1.1 socket.io : "+socket.id);
    socket.on('status', function (settings, status, priority) {
        var statusObject = _.extend(
            {
                lastReported: Date.now(),
                ip: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address,
                socket: socket.id,
                priority: priority
            },
            settings,
            status
        )
        statusObject.newSocketIo = true;
        players.updatePlayerStatus(statusObject)
    });

    socket.on('secret_ack', function (err) {
        players.secretAck(socket.id, err ? false : true);
    })

    socket.on('shell_ack', function (response) {
        players.shellAck(socket.id, response);
    });

    socket.on('media_ack', function (response) {
        players.playlistMediaAck(socket.id, response);
    });

    socket.on('snapshot', function (response) {
        players.piScreenShot(socket.id,response);
    });

    socket.on('setplaylist_ack', function(response) {
        players.playlistChangeAck(socket.id, response);
    });
    
    socket.on('upload', function (player, filename, data) {
        players.upload(player, filename, data);
    });

    socket.on('disconnect', function (reason) {
        players.updateDisconnectEvent(socket.id,reason);
        //console.log("disconnect event: "+socket.id);
    });
};

exports.startSIO = function (io) {
    io.sockets.on('connection', handleClient);
    //io.set('log level', 0);
    iosockets = io.sockets;
}

exports.emitMessage = function (sid) {
    if (iosockets.sockets[sid]) {
        var args = Array.prototype.slice.call(arguments,1);
        iosockets.sockets[sid].emit.apply(iosockets.sockets[sid], args);
    }
}

