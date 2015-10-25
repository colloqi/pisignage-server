'use strict';

/*

 */

angular.module('piPlayers.services', [])
    .factory('playerLoader', function ($http,piUrls,$state) {
        var observerCallbacks = {};
        var notifyObservers = function(){
            angular.forEach(observerCallbacks, function(callback){
                callback();
            });
        };

        var getPlayers = function(cb) {
            if (typeof cb !== 'function')
                cb = angular.noop;
            var options;
            if (playerLoader.group.selectedGroup)
                options = {params: {group: playerLoader.group.selectedGroup._id}}
            $http.get(piUrls.players, options)
                .success(function (data, status) {
                    if (data.success) {
                        playerLoader.player.players = data.data.objects;
                        playerLoader.player.currentVersion = data.data.currentVersion;
                        playerLoader.player.players.forEach(function(player){
                            if (!player.isConnected)
                                player.statusClass = "text-danger"
                            else if (!player.playlistOn)
                                player.statusClass = "text-warning"
                            else
                                player.statusClass = "text-success"
                            if (!player.lastReported)
                                player.lastReported = 0;    //never reported
                        });
                    }
                    cb(!data.success);
                })
                .error(function (data, status) {
                    cb(true);
                });
        }

        var playerLoader = {
            player: {
                players: [],
                currentVersion: null
            },

            group: {
                groups: [],
                groupNames: [],
                selectedGroup: null
            },
            playlist: {
                playlists: [],
                playlistNames: []
            },

            reload: function() {
                loadAllModels();
            },

            getPlayers: getPlayers,

            selectGroup: function(group) {
                playerLoader.group.selectedGroup = group;
                $state.go("home.players.players",{group: group?group._id:null})
                //notifyObservers();
            },
            registerObserverCallback: function(callback,key){
                observerCallbacks[key] = callback;
            }
        }

        var loadAllModels = function() {
            async.series([
                    function (next) {
                        $http.get(piUrls.groups, {})
                            .success(function (data, status) {
                                if (data.success) {
                                    playerLoader.group.groups = data.data;
                                    playerLoader.group.groupNames = playerLoader.group.groups.map(function(group){
                                        return (group.name)
                                    });
                                }
                                next()
                            })
                            .error(function (data, status) {
                                next()
                            });
                    },
                    function (next) {
                        $http
                            .get(piUrls.playlists, {})
                            .success(function (data, status) {
                                if (data.success) {
                                    playerLoader.playlist.playlists = data.data;
                                    playerLoader.playlist.playlistNames = playerLoader.playlist.playlists.map(function(playlist){
                                        return playlist.name;
                                    });
                                }
                                next();
                            })
                            .error(function (data, status) {
                                next();
                            });
                    },
                    function (next) {
                        getPlayers(next);
                    }
                ], function (err) {
                    notifyObservers();
                }
            )
        }
        loadAllModels();
        return playerLoader;
    }).factory('commands',function(){ // get cached commands 
        var storedArry =['*** Top of List Reached ***','tail -200 /home/pi/forever_out.log'], // favorite list
            current = 0;

        return {
            previous: function(){ // get previous command
                --current;
                if(current <= 0) 
                    current = 0 ;
                
                return storedArry[current];
            },
            next: function(){ // get next command
                ++current;
                if(current >= storedArry.length)
                     current = storedArry.length;
                
                return storedArry[current];
            },
            save: function(cmd){ // save command
                storedArry.push(cmd);
                current = storedArry.length;
            }
        }
    })