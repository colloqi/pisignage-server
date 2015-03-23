'use strict';

var iosockets = null;     //holds all the clients io.sockets

var players = require('./players'),
    _ = require('lodash');

var handleClient = function (socket) {

    socket.on('status', function (settings, status) {
        var statusObject = _.extend(
            {
                lastReported: Date.now(),
                ip: socket.handshake.address.address,
                socket: socket.id
            },
            settings,
            status
        )
        players.updatePlayerStatus(statusObject)
    });

    socket.on('secret_ack', function (err) {
        players.secretAck(socket.id, err ? false : true);
    })

    socket.on('shell_ack', function (response) {
        players.shellAck(socket.id, response);
    });

    socket.on('upload', function (player, filename, data) {
        players.upload(player, filename, data);
    });

    socket.on('disconnect', function () {
        console.log("disconnect event");
    });
};

exports.startSIO = function (io) {
    io.sockets.on('connection', handleClient);
    io.set('log level', 1);
    iosockets = io.sockets;
}

exports.emitMessage = function (sid, cmd, msg, msg1) {
    if (iosockets.sockets[sid]) {
        iosockets.sockets[sid].emit(cmd, msg, msg1);
    }
}

