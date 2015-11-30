'use strict;'

angular.module('piPlaylists.controllers', [])
    .controller('PlaylistsCtrl',function($scope, $http, $state, piUrls,assetLoader,piPopup){

        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            assetLoader.selectPlaylist()
        }

        $scope.newPlaylist = {}

        $scope.fn.add = function () {
            if (!$scope.newPlaylist.name) {
                return;
            }

            for (var i = 0; i < $scope.playlist.playlists.length; i++) {
                if ($scope.playlist.playlists[i].name == $scope.newPlaylist.name) {
                    $scope.newPlaylist.name = "Playlist exists";
                    return;
                }
            }

            $http
                .post(piUrls.playlists, {file: $scope.newPlaylist.name})
                .success(function (data, status) {
                    if (data.success) {
                        $scope.playlist.playlists.push(data.data);
                        assetLoader.selectPlaylist(data.data);
                        assetLoader.assemblePlaylistAssets();
                        $scope.newPlaylist = {}
                    }
                })
                .error(function (data, status) {
                });
        }

        $scope.fn.delete = function (index) {
            if ($scope.fn.editMode) {
                piPopup.confirm("Playlist "+$scope.playlist.playlists[index].name, function () {

                    $http
                        .delete(piUrls.files + '__' + $scope.playlist.playlists[index].name + '.json')
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.playlist.playlists.splice(index, 1);
                                assetLoader.assemblePlaylistAssets();
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected($scope.playlist.playlists[index])
            }
        }

        $scope.fn.rename = function (index) {
            $scope.playlist.playlists[index].renameEnable = false;
            if (!$scope.playlist.playlists[index].newname ||
                ($scope.playlist.playlists[index].name == $scope.playlist.playlists[index].newname)) {
                return;
            }

            for (var i = 0; i < $scope.playlist.playlists.length; i++) {
                if ($scope.playlist.playlists[i].name == $scope.playlist.playlists[index].newname) {
                    $scope.playlist.playlists[index].newname = "Playlist exists";
                    return;
                }
            }
            var oldname = $scope.playlist.playlists[index].name;
            $scope.playlist.playlists[index].name = $scope.playlist.playlists[index].newname;
            $http
                .post(piUrls.files + '__' + oldname+'.json', {  newname: '__' + $scope.playlist.playlists[index].name+'.json' })
                .success(function (data, status) {
                    if (!data.success) {
                        $scope.playlist.playlists[index].name = oldname;
                        $scope.playlist.playlists[index].newname = "Could not rename";
                    } else {
                        assetLoader.assemblePlaylistAssets();
                    }
                })
                .error(function (data, status) {
                    $scope.playlist.playlists[index].name = oldname;
                    $scope.playlist.playlists[index].newname = "Could not rename";
                });
        }

        $scope.fn.selected = function (playlist) {
            if (!$scope.fn.editMode) {
                assetLoader.selectPlaylist(($scope.playlist.selectedPlaylist &&
                                                        ($scope.playlist.selectedPlaylist.name == playlist.name)) ? null : playlist);
            } else {
                playlist.renameEnable = true;
                playlist.newname = playlist.name;
            }
            /*
            if ($scope.playlist.selectedPlaylist)
                $state.go("home.assets.playlistDetails",{playlist:playlist.name}, {reload:true});
            else
                $state.go("home.assets.playlists",{}, {reload:true});
            */
        }

        $scope.fn.getClass = function (playlist) {
            if ($scope.playlist.selectedPlaylist && $scope.playlist.selectedPlaylist.name == playlist.name) {
                return "bg-info"
            } else {
                return ""
            }
        }
    })


    .controller('PlaylistViewCtrl',
        function($scope, $http, $rootScope, piUrls, $window,$state,$modal, assetLoader){

            //modal for layout
            $scope.layouts = {
                "1": {title: "Single Zone Display", description: "main Zone:1280x720"},
                "2a": {title: "Two Zones with Main Zone on right", description: "main Zone:960x720, side Zone:320x720"},
                "2b": {title: "Two Zones with Main Zone on left", description: "main Zone:960x720, side Zone:320x720"},
                "2c": {
                    title: "Two Equal Size Zones with Video Zone on left",
                    disabled:!$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:640x720, side Zone:640x720"},
                "2d": {
                    title: "Two Equal Size Zones with Video Zone on right",
                    disabled:!$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:640x720, side Zone:640x720"},
                "3a": {
                    title: "Three Zones(full bottom) with Main Zone on right",
                    description: "main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"
                },
                "3b": {
                    title: "Three Zones(full bottom) with Main Zone on left",
                    description: "main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"
                },
                "3c": {
                    title: "Three Zones(full top) with Main Zone on right (enable in settings)",
                    description: "main Zone:960x540, side Zone:320x540, banner Zone:1280x180"
                },
                "3d": {
                    title: "Three Zones(full top) with Main Zone on left (enable in settings)",
                    description: "main Zone:960x540, side Zone:320x540, banner Zone:1280x180"
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
                    disabled:!$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                },
                "4d": {
                    title: "Three Zones(full side) with Main Zone on left (enable in settings)",
                    disabled:!$rootScope.serverConfig.newLayoutsEnable,
                    description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                },
                "2ap": {title: "Single Zone Portrait Mode", description: "main Zone:720x1280"},
                "2bp": {
                    title: "Two Zones Portrait Mode",
                    disabled:!$rootScope.serverConfig.newLayoutsEnable,
                    description: "top Zone:720x540,bottom zone:720x740"
                }
            }


            $scope.openLayout = function(){
                $scope.videoWindow = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.videoWindow || {}
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/layout-popup.html',
                    scope: $scope
                });
            }

            $scope.saveLayout = function(){  // get new layout value
                var pl = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
                $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name,
                                {layout : pl.layout, videoWindow: pl.videoWindow})
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
                $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.videoWindow = obj;
                $scope.saveLayout();
            }

            $scope.openTicker = function() {
                var settings = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.settings
                settings.ticker.enable = settings.ticker.enable || false
                settings.ticker.behavior = settings.ticker.behavior || 'slide'
                settings.ticker.rss = settings.ticker.rss || { enable: false , link: null }
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/ticker-popup.html',
                    scope: $scope
                });
            }

            $scope.openAd = function() {
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/ad-popup.html',
                    scope: $scope
                });
            }

            $scope.saveSettings = function() {
                var pl = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;

                if (pl.settings.ticker.style)
                    pl.settings.ticker.style = pl.settings.ticker.style.replace(/\"/g,'');

                $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name, {settings: pl.settings})
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    })
                    .finally(function(){
                        $scope.modal.close();
                    });
            }

            $scope.closeWindow = function () {
                assetLoader.selectPlaylist();
            };

        })

    .controller('PlaylistAddCtrl',function($scope, $http,  piUrls,$state,$modal, assetLoader){

        $scope.sortListName = "playlistAssets"
        if (!$scope.asset.showAssets)
            $state.go("home.assets.main")
        $scope.removeAsset = function(index) {
            var playlist = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
            if (playlist) {
                assetLoader.removeAssetFromPlaylist($scope.playlist.selectedPlaylist.name,index);
                $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name, {assets: playlist.assets})
                    .success(function (data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function (data, status) {
                        console.log(status);
                    });
            }
        }

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
            $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name,
                {assets: $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.assets})
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
                $state.go("home.assets.main",{playlist:$scope.playlist.selectedPlaylist.name},{reload: true})
            })
        }
    })

            


