'use strict;'

angular.module('piPlaylists.controllers', [])
    .factory('PlaylistTab', function () {
        var obj = {
            selectedPlaylist: null
        }
        return (obj)
    })

    .controller('PlaylistsCtrl',function($scope, $http, $state,$stateParams, piUrls,PlaylistTab,Label,piPopup){

        if ($stateParams.playlist)
            PlaylistTab.selectedPlaylist = {name:$stateParams.playlist};
        else
            PlaylistTab.selectedPlaylist = null;
        Label.selectedLabel = null;         //clear all selected Labels

        $scope.setAssetParam();

        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            PlaylistTab.selectedPlaylist = null;
        }

        $scope.newPlaylist = {}

        $scope.fn.add = function () {
            if (!$scope.newPlaylist.name) {
                return;
            }

            for (var i = 0; i < $scope.playlists.length; i++) {
                if ($scope.playlists[i].name == $scope.newPlaylist.name) {
                    $scope.newPlaylist.name = "Playlist exists";
                    return;
                }
            }

            $http
                .post(piUrls.playlists, {file: $scope.newPlaylist.name})
                .success(function (data, status) {
                    if (data.success) {
                        $scope.playlists.push(data.data);
                        $scope.assemblePlaylistAssets();
                        $scope.newPlaylist = {}
                    }
                })
                .error(function (data, status) {
                });
        }

        $scope.fn.delete = function (index) {
            if ($scope.fn.editMode) {
                piPopup.confirm("Playlist "+$scope.playlists[index].name, function () {

                    $http
                        .delete(piUrls.files + '__' + $scope.playlists[index].name + '.json')
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.playlists.splice(index, 1);
                                $scope.assemblePlaylistAssets();
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected($scope.playlists[index])
            }
        }

        $scope.fn.rename = function (index) {
            $scope.playlists[index].renameEnable = false;
            if (!$scope.playlists[index].newname ||
                ($scope.playlists[index].name == $scope.playlists[index].newname)) {
                return;
            }

            for (var i = 0; i < $scope.playlists.length; i++) {
                if ($scope.playlists[i].name == $scope.playlists[index].newname) {
                    $scope.playlists[index].newname = "Playlist exists";
                    return;
                }
            }
            var oldname = $scope.playlists[index].name;
            $scope.playlists[index].name = $scope.playlists[index].newname;
            $http
                .post(piUrls.files + '__' + oldname+'.json', {  newname: '__' + $scope.playlists[index].name+'.json' })
                .success(function (data, status) {
                    if (!data.success) {
                        $scope.playlists[index].name = oldname;
                        $scope.playlists[index].newname = "Could not rename";
                    } else {
                        $scope.assemblePlaylistAssets();
                    }
                })
                .error(function (data, status) {
                    $scope.playlists[index].name = oldname;
                    $scope.playlists[index].newname = "Could not rename";
                });
        }

        $scope.fn.selected = function (playlist) {
            if (!$scope.fn.editMode) {
                PlaylistTab.selectedPlaylist = (PlaylistTab.selectedPlaylist &&
                                                        (PlaylistTab.selectedPlaylist.name == playlist.name)) ? null : playlist;
            } else {
                playlist.renameEnable = true;
                playlist.newname = playlist.name;
            }
            if (PlaylistTab.selectedPlaylist)
                $state.go("home.assets.playlistDetails",{playlist:playlist.name}, {reload:true});
            else
                $state.go("home.assets.playlists",{}, {reload:true});
        }

        $scope.fn.getClass = function (playlist) {
            if (PlaylistTab.selectedPlaylist && PlaylistTab.selectedPlaylist.name == playlist.name) {
                return "bg-info"
            } else {
                return ""
            }
        }
    })


    .controller('PlaylistViewCtrl',
        function($scope, $http, $rootScope, piUrls, $window,$state, $stateParams,$modal){

            //modal for layout
            $scope.layouts = {
                "1": {title: "Single Zone Display", description: "main Zone:1280x720"},
                "2a": {title: "Two Zones with Main Zone on right", description: "main Zone:960x720, side Zone:320x720"},
                "2b": {title: "Two Zones with Main Zone on left", description: "main Zone:960x720, side Zone:320x720"},
                "3a": {
                    title: "Three Zones(full bottom) with Main Zone on right",
                    description: "main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"
                },
                "3b": {
                    title: "Three Zones(full bottom) with Main Zone on left",
                    description: "main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"
                },
                "4a": {
                    title: "Three Zones(full side) with Main Zone on right",
                    description: "main Zone:960x540, side Zone:320x720, bottom Zone:960x180"
                },
                "4b": {
                    title: "Three Zones(full side) with Main Zone on left",
                    description: "main Zone:960x540, side Zone:320x720, bottom Zone:960x180"
                },
                "4c": {
                    title: "Three Zones(full side) with Main Zone on right (enable in settings)",
                    disabled:$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                },
                "4d": {
                    title: "Three Zones(full side) with Main Zone on left (enable in settings)",
                    disabled:$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                },
                "2ap": {title: "Portrait Mode", description: "top Zone:720x540,bottom zone:720x740"}
            }


            $scope.openLayout = function(){
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/layout-popup.html',
                    scope: $scope
                });
            }

            $scope.saveLayout = function(){  // get new layout value
                var pl = $scope.groupWiseAssets[$scope.selected.playlist.name].playlist;
                $http.post(piUrls.playlists + $stateParams.playlist, {layout : pl.layout, videoWindow: $scope.layout.videoWindow})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }

            $scope.setVideoWindow = function(obj){ // SET/RESET video window options
                $scope.layout.videoWindow = obj;
                $scope.saveLayout();
            }

            $scope.saveSettings = function() {
                var pl = $scope.groupWiseAssets[$scope.selected.playlist.name].playlist;
                if (pl.settings.ticker.messages && pl.settings.ticker.messages.length)
                    pl.settings.ticker.enable = true;
                else
                    pl.settings.ticker.enable = false;

                if ($scope.settings.ticker.style)
                    $scope.settings.ticker.style = $scope.settings.ticker.style.replace(/\"/g,'');

                $http.post(piUrls.playlists + $stateParams.playlist, {settings: pl.settings})
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }

        })

    .controller('PlaylistAddCtrl',function($scope, $http,  piUrls,$state, $stateParams,$modal){
        // modal for link files
        $scope.linkFile = function(item,zone){
            //rawdata.fileD = $scope.filesDetails; //files from database
            //rawdata.fileA = $scope.playlistItems; // file from playlist
            $scope.selectedAsset = item;
            $scope.selectedZone = zone;

            $scope.modal = $modal.open({
                templateUrl: '/app/templates/linkfile-popup.html',
                scope: $scope
            });
        }

        $scope.linkFileSave = function(file){
            $scope.selectedAsset[$scope.selectedZone] = file;
            $scope.saveData();
            $scope.modal.close();
        }

        $scope.removeLinkFile = function(file,zone){
            file.playlistDetails[zone] = null;
            $scope.saveData();
        }

        $scope.saveData = function (cb) {
            $http.post(piUrls.playlists + $scope.selected.playlist.name,
                {assets: $scope.groupWiseAssets[$scope.selected.playlist.name].playlist.assets})
                    .success(function (data, status) {
                        if (data.success) {
                            if (cb)
                                cb();
                        }
                    })
                    .error(function (data, status) {
                        console.log(status);
                    });
        }

        $scope.done = function()  {
            $scope.saveData(function(){
                $state.go("home.assets.playlistDetails",{playlist:$scope.selected.playlist.name},{reload: true})
            })
        }
    })

            


