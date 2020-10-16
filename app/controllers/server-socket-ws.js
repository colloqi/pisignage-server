//var parseSignedCookie = require('express/node_modules/connect').utils.parseSignedCookie,
//    cookie = require('express/node_modules/cookie'),
//    sessionConfig = require('../../config/express').sessionConfig();
//session_store = sessionConfig.store;

var players = require('./players');
var _ = require('lodash');

var iosockets = null  //holds all the clients io.sockets
var nextClientId = 1


var handleClient = function(socket, request) {
    iosockets.sockets[nextClientId] = socket
    socket.id = nextClientId
    nextClientId++
    if (nextClientId > 1000000000000)
        nextClientId = 1
    if (iosockets.sockets[nextClientId])
        console.log("Error in generation of socket ID")

    socket.on('ping', function() {
        socket.isAlive = true
        socket.pong()
    })
    socket.on('message', function message(msg) {
        var messageArguments = ["none"];
        try {
            messageArguments = JSON.parse(msg)     //
        } catch (e) {
            console.error('Unable to parse message from client ws, '+msg)
            return;
        }
        switch (messageArguments[0]) {
            case "status":
                var settings = messageArguments[1],
                    status = messageArguments[2],
                    priority = messageArguments[3]

                var statusObject = _.extend(
                    {
                        lastReported: Date.now(),
                        ip: request.headers['x-forwarded-for'] || (request.address && request.address.address) ,
                            
                        socket: socket.id,
                        priority: priority,
                        serverName: request.headers.host.split(":")[0],
                    },
                    settings,
                    status
                )
                statusObject.newSocketIo = true;
                statusObject.webSocket = true;
                players.updatePlayerStatus(statusObject)
                break
            case 'secret_ack':
                players.secretAck(socket.id, !messageArguments[1])    //err
                break

            case 'shell_ack':
                players.shellAck(socket.id, messageArguments[1]);              //response
                break

            case 'snapshot':
                players.piScreenShot(socket.id, messageArguments[1]);          //response
                break

            case 'upload':
                var player = messageArguments[1],
                    filename = messageArguments[2],
                    data = messageArguments[3]
                players.upload(player, filename, data);
                break
            default:
                break
        }
    })
    socket.on('close',function (e) {
        players.updateDisconnectEvent(socket.id,e.reason);
        delete iosockets.sockets[socket.id]
    })

    socket.on('error',function (e){

    })

    socket.on('disconnect', function (reason) {
        // socketExists[socket.id] = false;
        players.updateDisconnectEvent(socket.id,reason);
        delete iosockets.sockets[socket.id]
    });
};



//authorization module
//var authorize= function(data, callback){
//    // check if there's a cookie header
//    if (data.headers.cookie) {
//        data.cookie = cookie.parse(data.headers.cookie);
//        data.sessionId = parseSignedCookie(data.cookie['connect.sid'], sessionConfig.secret);
//        data.colloqi = data.cookie['colloqi'];      //visitor cookie
//
//        session_store.get(data.sessionId, function (err, session) {
//            if (err || !session) {
//                // if we cannot grab a session, turn down the connection
//                data.user= null;
//                callback(null, true);
//            }
//            else {
//                if (session.passport.user && session.passport.user.id){
//                    data.user= session.passport.user;
//                    callback(null, true);
//                }
//                else {
//                    console.log('assigning default name,user not found');
//                    data.user= null;
//                    callback(null, true);
//                }
//            }
//        });
//    }
//    else {
//        // if there isn't, turn down the connection with a message
//        // and leave the function.
//        console.log('socket.io authentication: assigning default name,cookie not found');
//        data.user= null;
//        callback(null, true);
//    }
//};

exports.startSIO = function(wss) {
    wss.on('connection', handleClient)
    iosockets = {
        server: wss,
        sockets: {}
    }
    //Check all clients for hanging connections
    var healthCheckInterval = setInterval(function ping() {
        Object.keys(iosockets.sockets).forEach(function each(id) {
            var ws = iosockets.sockets[id]
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
        });
    }, 90000);

    wss.on('close', function close() {
        clearInterval(healthCheckInterval);
    });
}

exports.emitMessage = function(sid) {
    if (iosockets.sockets[sid]) {
        var args = Array.prototype.slice.call(arguments,1);
        iosockets.sockets[sid].send(JSON.stringify(args));
    }
}

