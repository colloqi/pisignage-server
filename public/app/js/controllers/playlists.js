'use strict;'

angular.module('piPlaylists.controllers', [])
    .factory('PlaylistTab', function () {
        var obj = {
            selectedPlaylist: null
        }
        return (obj)
    })

    .controller('PlaylistsCtrl',function($scope, $http, $state,$stateParams,$location, piUrls,PlaylistTab,piPopup){

        if ($stateParams.playlist)
            PlaylistTab.selectedPlaylist = {name:$stateParams.playlist};
        else
            PlaylistTab.selectedPlaylist = null;

        $scope.selected.rightWindowNeeded = $state.current.name.slice($state.current.name.lastIndexOf('.')+1) == "playlistAddAssets";
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
                        $scope.groupBy($scope.groupType);
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
                                $scope.groupBy($scope.groupType);
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected($scope.groups[index])
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
                        $scope.groupBy($scope.groupType);
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
                $location.path("/assets/playlists/" + playlist.name);
            else
                $location.path("/assets/playlists");
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
        function($scope, $http, $rootScope, piUrls, $location, $window,$state, $stateParams,$modal, Label,PlaylistTab){

            //modal for layout
            $scope.layouts = [
                    {type:"1",title:"Single Zone Display",description:"main Zone:1280x720"},
                    {type:"2a",title:"Two Zones with Main Zone on right",description:"main Zone:960x720, side Zone:320x720"},
                    {type:"2b",title:"Two Zones with Main Zone on left",description:"main Zone:960x720, side Zone:320x720"},
                    {type:"3a",title:"Three Zones(full bottom) with Main Zone on right",description:"main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"},
                    {type:"3b",title:"Three Zones(full bottom) with Main Zone on left",description:"main Zone:960x540, side Zone:320x540, bottom Zone:1280x180"},
                    {type:"4a",title:"Three Zones(full side) with Main Zone on right",description:"main Zone:960x540, side Zone:320x720, bottom Zone:960x180"},
                    {type:"4b",title:"Three Zones(full side) with Main Zone on left",description:"main Zone:960x540, side Zone:320x720, bottom Zone:960x180"},
                    {type:"2ap",title:"Portrait Mode",description:"top Zone:720x540,bottom zone:720x740"}
                ]
            $scope.openLayout = function(){
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/layout-popup.html',
                    scope: $scope
                });
            }

            $scope.saveLayout = function(){  // get new layout value
                var pl = $scope.groupWiseAssets[$scope.selected.playlist.name].playlist;
                $http.post(piUrls.playlists + $stateParams.playlist, {layout : pl.layout})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }

            $scope.saveSettings = function() {
                var pl = $scope.groupWiseAssets[$scope.selected.playlist.name].playlist;
                if (pl.settings.ticker.messages && pl.settings.ticker.messages.length)
                    pl.settings.ticker.enable = true;
                else
                    pl.settings.ticker.enable = false;

                $http.post(piUrls.playlists + $stateParams.playlist, {settings: pl.settings})
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }
            
            $scope.label_search= function(obj){
                if(Label.selectedLabel){
                    return ($scope.filesDetails && $scope.filesDetails[obj.filename] &&
                                $scope.filesDetails[obj.filename].labels &&
                                $scope.filesDetails[obj.filename].labels.indexOf(Label.selectedLabel) >= 0)
                } else {
                    return true;
                }
            }

            // modal for link files
            $scope.linkFile = function(item,zone){
                //rawdata.fileD = $scope.filesDetails; //files from database
                //rawdata.fileA = $scope.playlistItems; // file from playlist
                $scope.selectedAsset = item;
                $scope.selectedZone = zone;

                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/linkFilePopup.html',
                    scope: $scope
                });
            }

            $scope.linkFileSave = function(file){
                $scope.selectedAsset[$scope.selectedZone] = file;
                $scope.modal.close();
                $scope.playlist.form.$setDirty();
            }

        })

            


