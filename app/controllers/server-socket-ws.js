

import * as players from './players.js';

let iosockets = null;
let nextClientId = 1;


const handleClient = (socket, request) => {
    iosockets.sockets[nextClientId] = socket;
    socket.id = nextClientId;
    nextClientId++;
    if (nextClientId > 1000000000000)
        nextClientId = 1;
    if (iosockets.sockets[nextClientId])
        console.log("Error in generation of socket ID");

    socket.on('ping', () => {
        socket.isAlive = true;
        socket.pong();
    });
    
    socket.on('message', (msg) => {
        let messageArguments = ["none"];
        try {
            messageArguments = JSON.parse(msg);
        } catch (e) {
            console.error(`Unable to parse message from client ws, ${msg}`);
            return;
        }
        
        switch (messageArguments[0]) {
            case "status":
                const settings = messageArguments[1];
                const status = messageArguments[2];
                const priority = messageArguments[3];

                const safeSettings = (settings && typeof settings === 'object') ? settings : {};
                const safeStatus   = (status   && typeof status   === 'object') ? status   : {};

                const statusObject = {
                    ...safeSettings,
                    ...safeStatus,
                    lastReported: Date.now(),
                    ip: request.headers['x-forwarded-for'] || (request.address && request.address.address),
                    socket: socket.id,
                    priority: priority,
                    serverName: request.headers.host.split(":")[0],
                    newSocketIo: true,
                    webSocket: true
                };
                
                players.updatePlayerStatus(statusObject);
                break;
                
            case 'secret_ack':
                players.secretAck(socket.id, !messageArguments[1]); // err
                break;

            case 'shell_ack':
                players.shellAck(socket.id, messageArguments[1]); // response
                break;

            case 'snapshot':
                players.piScreenShot(socket.id, messageArguments[1]); // response
                break;

            case 'upload':
                const player = messageArguments[1];
                const filename = messageArguments[2];
                const data = messageArguments[3];
                players.upload(player, filename, data);
                break;
                
            default:
                break;
        }
    });
    
    socket.on('close', (e) => {
        players.updateDisconnectEvent(socket.id, e.reason);
        delete iosockets.sockets[socket.id];
    });

    socket.on('error', (e) => {
        // Error handler - you might want to log this
    });

    socket.on('disconnect', (reason) => {
        // socketExists[socket.id] = false;
        players.updateDisconnectEvent(socket.id, reason);
        delete iosockets.sockets[socket.id];
    });
};



export const startSIO = (wss) => {
    wss.on('connection', handleClient);
    iosockets = {
        server: wss,
        sockets: {}
    };
    
    // Check all clients for hanging connections
    const healthCheckInterval = setInterval(() => {
        Object.keys(iosockets.sockets).forEach((id) => {
            const ws = iosockets.sockets[id];
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
        });
    }, 90000);

    wss.on('close', () => {
        clearInterval(healthCheckInterval);
    });
};

export const emitMessage = (sid, ...args) => {
    if (iosockets.sockets[sid]) {
        iosockets.sockets[sid].send(JSON.stringify(args));
    }
};

