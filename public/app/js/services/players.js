'use strict';

/*

 */

angular.module('piPlayers.services', [])
    .factory('playerLoader', function ($http,piUrls,$state,assetLoader) {
        var observerCallbacks = {};
        var notifyObservers = function(){
            angular.forEach(observerCallbacks, function(callback){
                callback();
            });
        };

        var getPlayers = function(cb) {
            if (typeof cb !== 'function')
                cb = angular.noop;
            var options = {params: {}};
            if (playerLoader.group.selectedGroup)
                options.params['group'] = playerLoader.group.selectedGroup._id
            if (assetLoader.label.selectedPlayerLabel)
                options.params['label'] = assetLoader.label.selectedPlayerLabel

            Object.keys(assetLoader.label.labelsCount).forEach(function (item) {
                if (item.mode && item.mode === "players")
                    assetLoader.label.labelsCount[item] = 0;
            });

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
                            player.labels.forEach(function (item) {
                                assetLoader.label.labelsCount[item] = (assetLoader.label.labelsCount[item] || 0) + 1;
                            })
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
                        $http.get(piUrls.groups, {params:{all: "all"}})
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
    });