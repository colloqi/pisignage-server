"use strict" // REMOVE AFTER MIGRATING require TO import statements

const oldSocketio = require("919.socket.io"),
    socketio = require("socket.io");

const players = require("./players"),
    _ = require("lodash");

const { v4: uuidv4 } = require('uuid');

let clientSocketsOld = null;
let clientSocketsNew = null;
let clientSocketsNewWebSocketsOnly = null;
let clientSocketsWebSocket = null;
// let nextClientId = 1;
let nextClientId = uuidv4();


/* CONSTANTS FOR SOCKET NAMES --------------------------------------------------- */
const OLD_SOCKET = "old-socket";
const NEW_SOCKET = "new-socket";
const NEW_WEB_SOCKET = "new-web-socket";
const WEB_SOCKET = "web-socket";

/* HANDLE CLIENT BASED ON SOCKET TYPE ------------------------------------------- */
const handleClient = (socket, request, serverType) => {

    switch (serverType) {
        case OLD_SOCKET:
        case NEW_SOCKET:
        case NEW_WEB_SOCKET:

            socket.on("status", (settings, status, priority) => {
                let statusObject = _.extend(
                    {
                        lastReported: Date.now(),
                        ip:
                            socket.handshake.headers["x-forwarded-for"] ||
                            socket.handshake.address.address,
                        socket: socket.id,
                        priority: priority,
                    },
                    settings,
                    status
                );
                statusObject.newSocketIo =
                    serverType === NEW_SOCKET ||
                    serverType === NEW_WEB_SOCKET;
                players.updatePlayerStatus(statusObject);
            });

            socket.on("secret_ack", (err) => {
                players.secretAck(socket.id, err ? false : true);
            });

            socket.on("shell_ack", (response) => {
                players.shellAck(socket.id, response);
            });

            socket.on("media_ack", (response) => {
                players.playlistMediaAck(socket.id, response);
            });

            socket.on("snapshot", (response) => {
                players.piScreenShot(socket.id, response);
            });

            socket.on("setplaylist_ack", (response) => {
                players.playlistChangeAck(socket.id, response);
            });

            socket.on("upload", (player, filename, data) => {
                players.upload(player, filename, data);
            });

            socket.on("disconnect", (reason) => {
                players.updateDisconnectEvent(socket.id, reason);
            });

            break;

        case WEB_SOCKET:

            clientSocketsWebSocket.sockets[nextClientId] = socket;
            socket.id = nextClientId;
            // nextClientId++;
            nextClientId = uuidv4();


            // if (nextClientId > 1000000000000) nextClientId = 1;
            if (clientSocketsWebSocket.sockets[nextClientId])
                console.log("Error in generation of socket ID");

            socket.on("ping", function () {
                socket.isAlive = true;
                socket.pong();
            });

            socket.on("message", (msg) => {
                let messageArguments = ["none"];
                try {
                    messageArguments = JSON.parse(msg);
                } catch (e) {
                    console.error(
                        "Unable to parse message from client ws, " + msg
                    );
                    return;
                }
                switch (messageArguments[0]) {
                    case "status":
                        const settings = messageArguments[1]
                        const status = messageArguments[2]
                        const priority = messageArguments[3]

                        const statusObject = _.extend(
                            {
                                lastReported: Date.now(),
                                ip:
                                    request.headers["x-forwarded-for"] ||
                                    (request.address &&
                                        request.address.address),

                                socket: socket.id,
                                priority: priority,
                                serverName: request.headers.host.split(":")[0],
                            },
                            settings,
                            status
                        );
                        statusObject.newSocketIo = true;
                        statusObject.webSocket = true;
                        players.updatePlayerStatus(statusObject);
                        break;
                    case "secret_ack":
                        players.secretAck(socket.id, !messageArguments[1]);
                        break;

                    case "shell_ack":
                        players.shellAck(socket.id, messageArguments[1]);
                        break;

                    case "snapshot":
                        players.piScreenShot(socket.id, messageArguments[1]);
                        break;

                    case "upload":
                        const player = messageArguments[1],
                            filename = messageArguments[2],
                            data = messageArguments[3];
                        players.upload(player, filename, data);
                        break;
                    default:
                        break;
                }
            });

            socket.on("close", (e) => {
                players.updateDisconnectEvent(socket.id, e.reason);
                delete clientSocketsWebSocket.sockets[socket.id];
            });

            socket.on("error", (e) => {
                console.error(e.code, e.name)
            });

            socket.on("disconnect", (reason) => {
                // socketExists[socket.id] = false;
                players.updateDisconnectEvent(socket.id, reason);
                delete clientSocketsWebSocket.sockets[socket.id];
            });
            break;
        default:
            break;
    }
};

/* HANDLE CLIENT FUNCTION GENERATOR --------------------------------------------- */
const createHandleClient = (serverType) => {
    return (socket, request) => {
        handleClient(socket, request, serverType);
    };
};


/* START ALL SOCKETS ------------------------------------------------------------ */
const startOldSocket = (io) => {
    io.sockets.on("connection", createHandleClient(OLD_SOCKET));
    io.set("log level", 0);
    clientSocketsOld = io.sockets;
};

const startNewSocket = (ioNew) => {
    ioNew.sockets.on("connection", createHandleClient(NEW_SOCKET));
    clientSocketsNew = ioNew.sockets;
};

const startNewWebsocketOnly = (ioNewWebsocketOnly) => {
    ioNewWebsocketOnly.sockets.on(
        "connection",
        createHandleClient(NEW_WEB_SOCKET)
    );
    clientSocketsNewWebSocketsOnly = ioNewWebsocketOnly.sockets;
};

const startWebSocket = (wss) => {
    wss.on("connection", createHandleClient(WEB_SOCKET))
    

    clientSocketsWebSocket = {
        server: wss,
        sockets: {},
    };

    //Check all clients for hanging connections
    const healthCheckInterval = setInterval(() => {
        for (const id in clientSocketsWebSocket.sockets) {
            const webSocket = clientSocketsWebSocket.sockets[id];

            if (webSocket.isAlive === false) return webSocket.terminate();
            webSocket.isAlive = false;
        }
    }, 90000);

    wss.on("close", () => {
        clearInterval(healthCheckInterval);
    });
};


/* SOCKET ENTRY POINT ----------------------------------------------------------- */
const handleSockets = (server, wss) => {

    const io = oldSocketio.listen(server, { "destroy upgrade": false });
    const ioNew = socketio(server, {
        path: "/newsocket.io",
        serveClient: true,
        // below are engine.IO options
        pingInterval: 45000,
        pingTimeout: 45000,
        upgradeTimeout: 60000,
        maxHttpBufferSize: 10e7,
    });

    const ioNewWebsocketOnly = socketio(server, {
        path: "/wssocket.io",
        serveClient: true,
        // below are engine.IO options
        pingInterval: 45000,
        pingTimeout: 180000,
        upgradeTimeout: 180000,
        maxHttpBufferSize: 10e7,
    });

    startOldSocket(io);
    startNewSocket(ioNew);
    startNewWebsocketOnly(ioNewWebsocketOnly);
    startWebSocket(wss);

    io.on("error", function (err) {
        console.log("caught ECONNRESET error 2");
        console.log(err);
    });
    io.sockets.on("error", function (err) {
        logData;
        console.log("caught ECONNRESET error 3");
        console.log(err);
    });
    ioNew.on("error", function (err) {
        console.log("caught ECONNRESET error 4");
        console.log(err);
    });
    ioNew.sockets.on("error", function (err) {
        console.log("caught ECONNRESET error 5");
        console.log(err);
    });
};server.js

/* EMIT MESSAGE HANDLER  -------------------------------------------------------- */
const emitMessage = (serverType, sid, ...args) => {

    switch (serverType) {
        case OLD_SOCKET:
            if (clientSocketsOld.sockets[sid]) {
                clientSocketsOld.sockets[sid].emit.apply(
                    clientSocketsOld.sockets[sid],
                    args
                );
            }
            break;
        case NEW_SOCKET:
            if (clientSocketsNew.sockets[sid]) {
                clientSocketsNew.sockets[sid].emit.apply(
                    clientSocketsNew.sockets[sid],
                    args
                );
            }
            break;
        case WEB_SOCKET:
            if (clientSocketsWebSocket.sockets[sid]) {
                clientSocketsWebSocket.sockets[sid].send(JSON.stringify(args));
            }
            break;
        default:
            console.error("Socket type not specified!");
            break;
    }
};


/* EXPORTS ----------------------------------------------------------------- */ 
module.exports = {
    OLD_SOCKET,
    NEW_SOCKET,
    WEB_SOCKET,
    handleSockets,
    emitMessage,
};
