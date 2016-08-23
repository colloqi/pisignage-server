'use strict';

//cast related services

angular.module('pisignage.services')
    .factory('castApi',function($timeout,$rootScope,$http,piUrls){  // chrome cast receiver app start
        var DEVICE_STATE = {       //Constants of states for Chromecast device
            'IDLE' : 0,
            'ACTIVE' : 1,
            'WARNING' : 2,
            'ERROR' : 3,
        };

        var PLAYER_STATE = {      //Constants of states for CastPlayer
            'IDLE' : 'IDLE',
            'LOADING' : 'LOADING',
            'LOADED' : 'LOADED',
            'PLAYING' : 'PLAYING',
            'PAUSED' : 'PAUSED',
            'STOPPED' : 'STOPPED',
            'SEEKING' : 'SEEKING',
            'ERROR' : 'ERROR'
        };

        var messageTxt = {"type": "serverIp",
                            "ipAddress": "http://pisignage.com",
                            "port": 80,
                            "chromecastIp": "0.0.0.0"},
            nameSpace = "urn:x-cast:com.pisignage.instasign";

        var castStatus = {
                devicesAvailable: false,
                deviceState: DEVICE_STATE.IDLE
            },
            sessions = {},
            serverIp;

        $http.get(piUrls.settings)
            .success(function (data) {
                if (data.success)
                    serverIp = data.data.serverIp;

            }).error(function (err) {
            console.log(err);
        })

        function changeState() {
            $rootScope.$apply()
        }

        function stopped(session) {
            var present = false;
            sessions[session.statusText] = null;
            for (var key in sessions) {
                if (sessions[key] != null) {
                    present = true;
                    break;
                }
            }
            if (!present) {
                castStatus.deviceState = DEVICE_STATE.IDLE;
                changeState()
            }
        }

        function updateListener (session) {
            if (session.status == "stopped") {
                stopped(session)
            }
            sendServerIp(session);
        }

        /**
         * Requests that a receiver application session be created or joined. By default, the SessionRequest
         * passed to the API at initialization time is used; this may be overridden by passing a different
         * session request in opt_sessionRequest.
         */
        function launchApp () {
            console.log("launching app...");
            chrome.cast.requestSession(
                function(e) {
                    console.log("session success: " + e.sessionId);
                    castStatus.deviceState = DEVICE_STATE.ACTIVE;
                    sessions[e.statusText] = e;
                    sendServerIp(sessions[e.statusText]);
                    sessions[e.statusText].addUpdateListener(function(isAlive){
                        updateListener(sessions[e.statusText])
                    });
                    changeState()
                },
                function(e) {
                    if (e.code != "cancel") {
                        console.log("launch error");
                        castStatus.deviceState = DEVICE_STATE.ERROR;
                        changeState()
                    }
                }
            );
        };

        /**
         * Stops the running receiver application associated with the session.
         */
        function stopApp () {
            //let chrome cast extension handle stopping the cast
            launchApp ()
/*            session.stop(
                function() {
                    console.log("Session stopped");
                    castStatus.deviceState = DEVICE_STATE.IDLE;
                    castPlayerState = PLAYER_STATE.IDLE;
                    changeState()
                },
                function(e){
                    console.log('cast initialize error',e);
                }
            )*/
        };

        function sendServerIp (session) {
            if (!session)
                return;

            session.sendMessage(nameSpace,
                {
                    type: 'serverIp',
                    ipAddress: "http://"+serverIp,
                    port: window.location.port,
                    chromecastIp: session.receiver.ipAddress,
                    chromecastName: session.receiver.friendlyName
                },
                function(){
                    console.log("Server IP message has been sent")
                }, function(err){
                    console.log("Server IP message sending error: "+err)
                }
            )
        }

        function sessionListener(e){
            sessions[e.statusText] = e;
            console.log("Session listener callback")
            if( sessions[e.statusText] ) {
                castStatus.deviceState = DEVICE_STATE.ACTIVE;
                sessions[e.statusText].addUpdateListener(function(isAlive){
                    updateListener(sessions[e.statusText])
                });
                sessions[e.statusText].addMessageListener('urn:x-cast:com.pisignage.instasign', function(s1,s2){
                    console.log("message received")
                })
                changeState()
            }
        }

        function receiverListener(devicePresent){
            if( devicePresent === chrome.cast.ReceiverAvailability.AVAILABLE) {
                castStatus.devicesAvailable = true;
                console.log("devices present")
            } else {
                castStatus.devicesAvailable = false;
                console.log("receiver list empty");
            }
            changeState()
        }

        function castInit(){
            if (typeof chrome === "undefined")    //for other browsers
                return;

            if (!chrome.cast || !chrome.cast.isAvailable) {
                $timeout(castInit,1000)
                return;
            }
            var applicationID = '90DC4B3D';
            // auto join policy can be one of the following three
            var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
            //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
            //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED;

            // request session
            var sessionRequest = new chrome.cast.SessionRequest(applicationID);
            var apiConfig = new chrome.cast.ApiConfig(sessionRequest,sessionListener,receiverListener,autoJoinPolicy);

            chrome.cast.initialize(apiConfig,
                function(){
                    console.log('cast init success')
                }, function(e){
                    console.log('cast initialize error',e);
                }
            );
        }


        return {
            init: castInit,
            launchApp: launchApp,
            stopApp: stopApp,
            castStatus: castStatus
        }
    })