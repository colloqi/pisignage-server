'use strict'

angular.module('piPlaylists.controllers', [])
    .controller('PlaylistsCtrl',function($scope, $http, $state, piUrls,assetLoader,piConstants,piPopup){

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

            $scope.newPlaylist.name = $scope.newPlaylist.name.replace(piConstants.groupNameRegEx,'');


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
                        $scope.playlist.playlists.unshift(data.data);
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
                    $http.post(piUrls.playlistfiles,{playlist:$scope.playlist.playlists[index].name,assets:[]})
                        .success(function(data, status) {
                            console.log(data);
                        })
                        .error(function(data, status) {
                            console.log(status);
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
        function($scope, $http, $rootScope, piUrls, $window,$state,$modal, assetLoader, layoutOtherZones,$timeout){

            $scope.customTemplates = function(asset) {
                return asset.match(/^custom_layout.*html$/i)
            }
            //modal for layout
            function loadLayoutStructure () {
                var customLayoutsPresent = false;
                for (var i=0,len = $scope.asset.files.length;i<len;i++) {
                    if ($scope.customTemplates($scope.asset.files[i])) {
                        customLayoutsPresent = true;
                        break;
                    }
                }

                $scope.layouts = {
                    "1": {title: "Single Zone Display", description: "main Zone:1280x720"},
                    "2a": {
                        title: "Two Zones with Main Zone on right",
                        description: "main Zone:960x720, side Zone:320x720"
                    },
                    "2b": {
                        title: "Two Zones with Main Zone on left",
                        description: "main Zone:960x720, side Zone:320x720"
                    },
                    "2c": {
                        title: "Two Equal Size Zones with Video Zone on left",
                        //disabled:!$rootScope.serverConfig.newLayoutsEnable,
                        description: "main Zone:640x720, side Zone:640x720"
                    },
                    "2d": {
                        title: "Two Equal Size Zones with Video Zone on right",
                        //disabled:!$rootScope.serverConfig.newLayoutsEnable,
                        description: "main Zone:640x720, side Zone:640x720"
                    },
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
                        //disabled:!$rootScope.serverConfig.newLayoutsEnable,
                        description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                    },
                    "4d": {
                        title: "Three Zones(full side) with Main Zone on left (enable in settings)",
                        //disabled:!$rootScope.serverConfig.newLayoutsEnable,
                        description: "main Zone:960x540, side Zone:320x720, banner Zone:960x180"
                    },
                    "2ap": {title: "Single Zone Portrait Mode, Orient clockwise", description: "main Zone:720x1280"},
                    "2bp": {
                        title: "Two Zones Portrait Mode, Orient clockwise",
                        //disabled:!$rootScope.serverConfig.newLayoutsEnable,
                        description: "top Zone:720x540,bottom zone:720x740"
                    },
                    "2ap270": {
                        title: "Single Zone Portrait Mode,Orient anti-clockwise",
                        description: "main Zone: 720x1280 "
                    },
                    "2bp270": {
                        title: "Two Zone Portrait Mode,Orient anti-clockwise",
                        description: "top Zone:720x540,bottom zone:720x740"
                    },
                    "custom": {
                        title: "Custom Layout in Landscape Mode (v1.6.0+)",
                        disabled: !customLayoutsPresent,
                        description: "Upload custom_layout.html under Assets Tab(otherwise this option is disabled), Use #main,#side, #bottom, #ticker html ID tags for content, see github e.g. "
                    },
                    "customp": {
                        title: "Custom Layout in Portrait Mode, Orient clockwise",
                        disabled: !customLayoutsPresent,
                        description: "Upload custom_layout.html under Assets Tab(otherwise this option is disabled), Use #main,#side, #bottom, #ticker html ID tags for content, see github e.g."
                    },
                    "customp270": {
                        title: "Custom Layout in Portrait Mode,Orient anti-clockwise",
                        disabled: !customLayoutsPresent,
                        description: "Upload custom_layout.html under Assets Tab(otherwise this option is disabled), Use #main,#side, #bottom, #ticker html ID tags for content, see github e.g."
                    }

                }
            }
            loadLayoutStructure();

            $scope.layoutOtherZones = layoutOtherZones;
            $scope.openLayout = function(){
                var playlistObj = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
                loadLayoutStructure();
                playlistObj.videoWindow = playlistObj.videoWindow || {mainzoneOnly:false}
                playlistObj.zoneVideoWindow = playlistObj.zoneVideoWindow || {}
                $scope.videoWindow = playlistObj.videoWindow
                $scope.zoneVideoWindow = playlistObj.zoneVideoWindow
                $scope.modal = $modal.open({
                    templateUrl: 'app/templates/layout-popup.html',
                    scope: $scope
                });
            }

            $scope.selectTemplate = function(asset, layout) {
                if (!asset)
                    return;
                var pl = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
                pl.templateName = asset
                pl.layout = layout
                $scope.saveLayout();
            }


            $scope.saveLayout = function(){  // get new layout value
                var pl = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
                $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name,
                                {layout : pl.layout, videoWindow: pl.videoWindow, zoneVideoWindow: pl.zoneVideoWindow,
                                    templateName: pl.templateName,})
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

            $scope.setZoneVideoWindow = function(zone,obj){ // SET/RESET video window options
                $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.zoneVideoWindow[zone] = obj;
                $scope.saveLayout();
            }

            $scope.openTicker = function() {
                var settings = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.settings
                settings.ticker.enable = settings.ticker.enable || false
                settings.ticker.behavior = settings.ticker.behavior || 'slide'
                settings.ticker.textSpeed = settings.ticker.textSpeed || 3
                settings.ticker.rss = settings.ticker.rss || { enable: false , link: null, feedDelay:10 }
                $scope.tickerObj = $scope.playlist.selectedPlaylist.settings.ticker;
                $scope.modal = $modal.open({
                    templateUrl: 'app/templates/ticker-popup.html',
                    scope: $scope
                });
            }

            $scope.openAd = function() {
                var settings = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.settings
                settings.ads = settings.ads || {adPlaylist : false, adInterval : 60 } ;
                settings.ads.adCount = settings.ads.adCount || 1;
                settings.audio = settings.audio || {enable: false,random: false,volume: 50}  ;
                $scope.modal = $modal.open({
                    templateUrl: 'app/templates/ad-popup.html',
                    scope: $scope
                });
            }

            $scope.saveTickerSettings = function() {
                $scope.saveSettings();
            }

            $scope.saveSettings = function() {
                var pl = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;

                if (pl.settings.ticker.rss && pl.settings.ticker.rss.enable && !pl.settings.ticker.rss.link) {
                    $scope.tickerPopupErrMessage = "Please enter RSS link address";
                    $timeout(function(){
                        $scope.tickerPopupErrMessage = ""
                        return;
                    },3000)
                    return;
                }
                if (pl.settings.ticker.style)
                    pl.settings.ticker.style = pl.settings.ticker.style.replace(/\"/g,'');
                if (pl.settings.ticker.messages)
                    pl.settings.ticker.messages = pl.settings.ticker.messages.replace(/'/g, "`")

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

    .controller('PlaylistAddCtrl',function($scope, $http,  piUrls,$state,$modal, assetLoader,piConstants,layoutOtherZones){

        console.log($state.params.playlist);
        $scope.sortListName = "playlistAssets"
        $scope.layoutOtherZones = layoutOtherZones;
        if(!$scope.playlist.selectedPlaylist){
            setTimeout(function(){
                var selectedPlaylist=$scope.playlist.playlists.filter(playlist=>{
                    return playlist.name==$state.params.playlist;
                });
                assetLoader.selectPlaylist(selectedPlaylist[0])
                $state.reload();
                console.log($scope.asset.showAssets);
                mainfn(); 
            }, 500);
        }
        else
            mainfn();
        function mainfn(){
            if ($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.templateName &&
                    ($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.layout.indexOf("custom") == 0) &&
                ($scope.asset.files.indexOf($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.templateName) >=0)) {

                enableCustomZones($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.templateName)
            }

            if (!$scope.asset.showAssets)
                $state.go("home.assets.main")
        }
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
        var enableCustomZones = function(templateName) {

            $http.get("/media/"+templateName, {} )
                .success(function(data, status) {
                    if (data) {
                        $scope.customZonesPresent = {}
                        layoutOtherZones["custom"].forEach(function (zone) {
                            $scope.customZonesPresent[zone] = (data.indexOf(zone) != -1)
                        })
                    }
                })
                .error(function(data, status) {
                });
        }

        $scope.makeCopy = function(mediaObj,position) {
            var playlist = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
            if (playlist) {
                playlist.assets.splice(position, 0, angular.copy(playlist.assets[position]))
                $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].assets.splice(position, 0,
                    angular.copy($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].assets[position]))
                $http.post(piUrls.playlists + playlist.name, {assets: playlist.assets})
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
            if (item[zone] && item[zone].indexOf("__") == 0)
                $scope.tabIndex = 1;
            else
                $scope.tabIndex = 0;

            $http
                .get(piUrls.playlists, {})
                .success(function(data, status) {
                    if (data.success && Array.isArray(data.data)) {
                        $scope.playlistsList = data.data.map(function(entry){
                            return {displayName: entry.name,plName: '__'+entry.name+'.json'};
                        })
                    }
                })
                .error(function(data, status) {
                });

            $scope.filteredAssets = $scope.asset.allAssets.assets.filter(function(fileObj){
                var file = fileObj.fileDetails.name
                return !(file.match(piConstants.audioRegex) ||
                file.match(piConstants.liveStreamRegex) || file.match(piConstants.CORSLink));
            })
            

            $scope.modal = $modal.open({
                templateUrl: 'app/templates/linkfile-popup.html',
                scope: $scope
            });
        }

        $scope.changeTab = function(index) {
            $scope.tabIndex = index;
        }

        $scope.linkFileSave = function(file){
            $scope.selectedAsset[$scope.selectedZone] = file;
            $scope.saveData();
            //$scope.modal.close();
        }

        $scope.removeLinkFile = function(file,zone){
            file.playlistDetails[zone] = null;
            $scope.saveData();
        }

        $scope.saveData = function (cb) {
            $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.assets.forEach(function(item){
                //if ($scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.layout == "1")
                //    item.fullscreen = true;
                if (layoutOtherZones[$scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.layout].length == 0)
                    item.fullscreen = true;
                if (item.duration < 2)
                    item.duration = 2; //force duration to 2 sec minimum
            });
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
            var assetFiles = [],
                layout = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.layout
            $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist.assets.forEach(function(item){
                assetFiles.push(item.filename)
                layoutOtherZones[layout].forEach(function(zone){
                    if (item[zone] && assetFiles.indexOf(item[zone]) == -1)
                        assetFiles.push(item[zone]);
                })
                // if (item.side && assetFiles.indexOf(item.side) == -1)
                //     assetFiles.push(item.side);
                // if (item.bottom && assetFiles.indexOf(item.bottom) == -1)
                //     assetFiles.push(item.bottom);
            })
            $http.post(piUrls.playlistfiles,{playlist:$scope.playlist.selectedPlaylist.name,assets: assetFiles})
                .success(function(data, status) {
                    //console.log(data);
                })
                .error(function(data, status) {
                    console.log(status);
                });
        }

        $scope.done = function()  {
            $scope.saveData(function(){
                $state.go("home.assets.main",{playlist:$scope.playlist.selectedPlaylist.name},{reload: true})
            })
        }
    })

            


