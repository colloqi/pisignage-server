'use strict;'

angular.module('piplaylist.controllers', [])
    .factory('miscMethods', function() {
        return ({
            toPlJsonExt: function(file){
                return '__'+file+'.json';
            }
        })
    })
    .controller('PlaylistsCtrl',['$scope', '$http', 'Navbar', '$location', '$state','miscMethods','piUrls','piFeatures',
        function($scope, $http, Navbar, $location, $state, miscMethods,piUrls,piFeatures){

            if (piFeatures.playlistEditFeature) {
                Navbar.showPrimaryButton= true;
                Navbar.primaryButtonText= "EDIT";
                Navbar.primaryButtonTypeClass= "btn-info";
            } else {
                Navbar.showPrimaryButton= false;
            }

            $http
                .get(piUrls.playlists, {})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.playlists= data.data;
                    }
                })
                .error(function(data, status) {
                });


            $scope.pbHandler = function(buttonText){
                $location.path('/playlists/edit');
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;

            $scope.loadPlaylist = function(name){
                $location.path("/playlists/details/"+name);
            }

        }])


    .controller('PlaylistViewCtrl',['$scope', '$http', '$rootScope', 'piUrls',
        '$location', '$document', '$window', 'Navbar', '$state', '$stateParams','$modal','selectedLabel','saveChangesPrompt','piConstants',
        function($scope, $http, $rootScope, piUrls, $location, $document, $window, Navbar,$state, $stateParams,$modal, selectedLabel,saveChangesPrompt,piConstants){


            $scope.status = {
                plainView : true
            }
            
            Navbar.showPrimaryButton= true;

            $http.get(piUrls.getStatus,{}).success(function(data,status){
                if (data.data.server) {
                    Navbar.showPrimaryButton= false;
                    return;
                }
                if(data.data.playlistOn){
                    Navbar.primaryButtonText= 'STOP';
                    Navbar.primaryButtonTypeClass= "btn-danger";
                }else{
                    Navbar.primaryButtonText= 'PLAY';
                    Navbar.primaryButtonTypeClass= "btn-info";
                }
                
            });

            $scope.title = $stateParams.file;
            $scope.playlistItems = [];
            $scope.assets = [];
            $scope.customPl = {unassigned: [], playlist: []};
            $scope.layout = {type: "1"}

            var makeCurrent = function() {

                if (!$scope.playlistLoaded || !$scope.assetsLoaded )
                    return;

                var plfiles = [];

                for (var key in $scope.playlistItems) {
                    plfiles.push($scope.playlistItems[key].filename);
                    if($scope.playlistItems[key].filename.match(piConstants.videoRegex))
                        $scope.playlistItems[key].isVideo = true;
                    $scope.customPl.playlist.push($scope.playlistItems[key]);
                }

                for (var i= 0,len=$scope.assets.length;i<len;i++) {
                    if (plfiles.indexOf($scope.assets[i]) == -1) {
                        var videoDuration = 10;
                        if ($scope.filesDetails && $scope.filesDetails[$scope.assets[i]])
                            videoDuration = parseInt($scope.filesDetails[$scope.assets[i]].duration)  || 10;

                        var isVideo,
                            obj = {filename: $scope.assets[i], duration:  videoDuration, selected: false};
                        if($scope.assets[i].match(piConstants.videoRegex))
                            obj.isVideo = true;
                        $scope.playlistItems.push(obj);
                        $scope.customPl.unassigned.push(obj);
                    }
                }

                for (var i= 0,len=$scope.playlistItems.length;i<len;i++) {
                    if (($scope.assets.indexOf($scope.playlistItems[i].filename) == -1) && ($scope.playlistItems[i].selected)) {
                        $scope.playlistItems[i].deleted = true;
                        $scope.filesDetails[$scope.playlistItems[i].filename]= {type: 'Deleted'};
                    }
                }
            }

            $scope.$watch('playlist.form.$dirty', function(newVal, oldVal) {
                if(newVal && $scope.status.plainView) {
                    Navbar.showPrimaryButton= true;
                    Navbar.primaryButtonText= "SAVE";
                    Navbar.primaryButtonTypeClass= "btn-success";
                }
                if(newVal && !$scope.status.plainView) {
                    var len = $scope.customPl.playlist.length;
                    for(i=0; i< len; i++) {
                        var item = $scope.customPl.playlist[i];
                        if(!item.selected) {
                            $scope.customPl.unassigned.push(item);
                            $scope.customPl.playlist.splice(i, 1);   
                            break;
                        }
                    }                  
                    $scope.pbHandler('SAVE');
                }
            });

            $http.get(piUrls.playlists+$stateParams.file, {} )
                .success(function(data, status) {
                    if (data.success) {
                        $scope.settings = data.data.settings || {ticker:{enable:false},
                                                                    ads : {adPlaylist : false, adInterval : 60 }};
                        $scope.playlistItems = data.data.assets || [];
                        $scope.layout.type = data.data.layout;
                        $scope.playlistLoaded = true;
                        makeCurrent();
                    }
                })
                .error(function(data, status) {
                });

            $http.get(piUrls.files, {} )
                .success(function(data, status) {
                    if (data.success) {
                        $scope.assets = data.data.files || [];
                        if (data.data.dbdata) {
                            $scope.filesDetails = {};
                            Object.keys(selectedLabel.labelsCount).forEach(function(item){
                                selectedLabel.labelsCount[item]= 0;
                            });
                            data.data.dbdata.forEach(function(dbdata){
                                if ($scope.assets.indexOf(dbdata.name) >=0){
                                    $scope.filesDetails[dbdata.name] = dbdata;
                                }
                            })
                            for (var filename in $scope.filesDetails) {
                                $scope.filesDetails[filename].labels.forEach(function (item) {
                                    selectedLabel.labelsCount[item] = (selectedLabel.labelsCount[item] || 0) + 1;
                                })
                            }
                        } else {
                            $scope.filesDetails = {};
                            $scope.assets.forEach(function(item) {
                                if(item.match(piConstants.videoRegex)) {
                                    $scope.filesDetails[item] ={ type: 'Video'};
                                }
                                if(item.match(piConstants.imageRegex)) {
                                    $scope.filesDetails[item] ={ type: 'Image'};
                                }
                                if(item.match(piConstants.noticeRegex)) {
                                    $scope.filesDetails[item] ={ type: 'Notice'};
                                } 
                                if(item.match(/gcal$/i)) {
                                    $scope.filesDetails[item] ={ type: 'Google'};
                                }                                
                            })
                        }
                        $scope.assetsLoaded = true;
                        makeCurrent();
                    }
                })
                .error(function(data, status) {
                });
    
            $scope.sortableOptions = {
                connectWith: ".dragContainers",  
                opacity: 0.7,
                cursor: "move",      
                placeholder: 'sort-placholder',   
                revert: 100,                                
                update: function(e, ui) {
                    if($scope.status.plainView){
                        Navbar.showPrimaryButton= true;
                        Navbar.primaryButtonText= "SAVE";
                        Navbar.primaryButtonTypeClass= "btn-success";
                    }
                },
                stop: function(e, ui) {
                    $scope.playlist.form.$setDirty();
                    if(!$scope.status.plainView) {
                        if(ui.item.sortable.droptarget && ui.item.sortable.droptarget[0].id == 'assigned') {
                            $scope.customPl.playlist.forEach(function(item) {  
                                if(!item.selected)
                                    item.selected = true;
                            })
                        } else {
                            $scope.customPl.unassigned.forEach(function(item) {
                                if(item.selected)                           
                                    item.selected = false;
                            })  
                        }
                        $scope.pbHandler('SAVE');
                    }
                }
            };
 
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
                    templateUrl: '/app/templates/layoutPopup.html',
                    scope: $scope
                });
            }

            $scope.saveLayout = function(){  // get new layout value
                $http.post(piUrls.playlists + $stateParams.file, {layout : $scope.layout.type})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }

            $scope.ticker = function() {
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/tickerPopup.html',
                    scope: $scope
                });
            }

            $scope.tickerSave = function() {
                $http.post(piUrls.playlists + $stateParams.file, {settings: $scope.settings})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                        $scope.modal.close();
                    });
            }
            $scope.adPopUp = function(){
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/adEnablePopUp.html',
                    scope: $scope
                });
            }

            $scope.adModalCancel = function(){
                $scope.modal.close();
            }

            $scope.adSave = function(){
                $http.post(piUrls.playlists + $stateParams.file, {settings: $scope.settings})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                        $scope.modal.close();
                    });
            }
            
            $scope.pbHandler = function(buttonText){
                if (Navbar.primaryButtonText == "SAVE" || buttonText == "SAVE") {
                    var selectedItems,
                        arr = ($scope.status.plainView) ? $scope.playlistItems : $scope.customPl.playlist;
                    selectedItems = arr.filter(function(item){
                        return item.selected;
                    });
                    $scope.playlist.form.$setPristine();
                    $http.post(piUrls.playlists + $stateParams.file, {layout: $scope.layout.type,assets: selectedItems, settings: $scope.settings})
                        .success(function(data, status) {
                            if (data.success) {
                                //$state.transitionTo($state.current, $stateParams, { reload: true, inherit: false, notify: true });
                                if($scope.status.plainView) {
                                    return $window.history.back();
                                }
                            }
                        })
                        .error(function(data, status) {
                            console.log(status);
                        });
                } else if (buttonText == "PLAY") {
                    Navbar.primaryButtonText = "WAIT";
                    Navbar.primaryButtonTypeClass= "btn-warning";
                    $http
                        .post(piUrls.play+ $stateParams.file, { play: true})
                        .success(function(data,success){
                            if (data.success) {
                                $location.path('/');
                                //Navbar.primaryButtonText = "STOP";
                                //Navbar.primaryButtonTypeClass= "btn-danger";
                            }else {
                            }
                        })
                        .error(function(data,status){
                            console.log('playall request failed');
                        })
                } else if (buttonText == "STOP") {
                    Navbar.primaryButtonText = "WAIT";
                    Navbar.primaryButtonTypeClass= "btn-warning";
                    $http
                        .post(piUrls.play+ $stateParams.file, { stop: true})
                        .success(function(data,success){
                            if (data.success) {
                                $location.path('/');
                                //Navbar.primaryButtonText = "PLAY";
                                //Navbar.primaryButtonTypeClass= "btn-info";
                            }else {

                            }
                        })
                }
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;
            
            $scope.label_search= function(obj){
                if(selectedLabel.selectedLabel){
                    return ($scope.filesDetails && $scope.filesDetails[obj.filename] &&
                                $scope.filesDetails[obj.filename].labels &&
                                $scope.filesDetails[obj.filename].labels.indexOf(selectedLabel.selectedLabel) >= 0)
                } else {
                    return true;
                }
            }
        }])

    .controller('PlaylistsEditCtrl',['$scope', '$http', 'Navbar', '$location', '$state', 'piUrls','piFeatures', 'piPopup',
        function($scope, $http, Navbar, $location, $state, piUrls,piFeatures,piPopup){

            $scope.renameFeature  = piFeatures.playlistRenameFeature;

            Navbar.showPrimaryButton= true;
            Navbar.primaryButtonText = "DONE";
            Navbar.primaryButtonTypeClass= "btn-success";

            $http
                .get(piUrls.playlists, {})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.playlists= data.data;
                        for (var i=0; i <$scope.playlists.length; i++) {
                            if ($scope.playlists[i].name == "default") {
                                $scope.playlists.splice(i,1);
                                break;
                            }
                        }
                        $scope.playlistsCopy= angular.copy($scope.playlists);
                    }
                })
                .error(function(data, status) {
                });

            
            $scope.pbHandler = function(buttonText){
                $location.path('/playlists');
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;

            $scope.delete= function(index){
                piPopup.confirm("Playlist", function() {
                    $http
                        .delete(piUrls.files + '__' + $scope.playlists[index].name + '.json')
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.playlists.splice(index, 1);
                                $scope.playlistsCopy.splice(index, 1);
                            }
                        })
                        .error(function (data, status) {
                        });
                });
            }


            $scope.newPlaylist = "playlist"
            $scope.add= function(){

                if (!$scope.newPlaylist) {
                    $scope.newPlaylist = "Empty name not allowed";
                    $scope.addform.$setPristine();
                    $scope.fieldStatus = "has-error";
                    return;
                }

                for (var i=0; i <$scope.playlists.length; i++) {
                    if ($scope.playlists[i].name == $scope.newPlaylist) {
                        $scope.newPlaylist = "File name already exists";
                        $scope.addform.$setPristine();
                        $scope.fieldStatus = "has-error";
                        return;
                    }
                }

                $http
                    .post(piUrls.playlists, {file: $scope.newPlaylist})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.playlists.push({name: $scope.newPlaylist, settings: ""});
                            $scope.playlistsCopy.push({name: $scope.newPlaylist, settings: ""});
                            $scope.addform.$setPristine();
                            $scope.fieldStatus = "has-success";
                            $scope.addPlaylist = false;
                        }
                    })
                    .error(function(data, status) {
                    });
            }
            
    }])

    .controller('PlaylistsItemCtrl',['$scope','$http', 'piUrls',function($scope,$http,piUrls){
        $scope.rename= function(index){
            if (!$scope.playlists[index].name) {
                $scope.playlists[index].name = "Empty name not allowed";
                $scope.pleditform.$setPristine();
                $scope.fieldStatus = "has-error";
                return;
            }
            for (var i=0; i <$scope.playlistsCopy.length; i++) {
                if ($scope.playlistsCopy[i].name == $scope.playlists[index].name) {
                    $scope.playlists[index].name = "File name already exists";
                    $scope.pleditform.$setPristine();
                    $scope.fieldStatus = "has-error";
                    return;
                }
            }
            var oldname = '__' + $scope.playlistsCopy[index].name +'.json',
                newname = '__' + $scope.playlists[index].name+'.json';
                $http
                    .post(piUrls.files + oldname, {  newname: newname })
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.playlistsCopy[index].name = $scope.playlists[index].name;
                            $scope.pleditform.$setPristine();
                            $scope.fieldStatus = "has-success";
                        }
                    })
                    .error(function (data, status) {
                    });
        }
    }])

