'use strict';

angular.module('piGroups.controllers', [])

    .controller('GroupsCtrl', function ($scope, $http,piUrls,Navbar,$location,piFeatures) {

        $scope.navbar = Navbar;

        if (piFeatures.groupEditFeature) {
            Navbar.showPrimaryButton= true;
            Navbar.primaryButtonText= "EDIT";
            Navbar.primaryButtonTypeClass= "btn-info";
        } else {
            Navbar.showPrimaryButton= false;
        }


        $http.get(piUrls.groups,{})
            .success(function(data, status) {
                if (data.success) {
                    $scope.groups = data.data;
                }
            })
            .error(function(data, status) {
            });


        $scope.loadGroup = function(group) {
            $location.path("/groups/details/"+group);          
        }

        $scope.pbHandler = function(buttonText){
            if (buttonText == "EDIT") {
                $location.path('/groups/edit');
            }
        }
        Navbar.primaryButtonHandler = $scope.pbHandler;

    })

    .controller('GroupDetailCtrl',['$scope','$rootScope', '$http','piUrls', '$stateParams','$location','$modal','piPopup','$timeout',
        function($scope, $rootScope, $http, piUrls, $stateParams,$location,$modal,piPopup,$timeout){
            $scope.radio = {};
            
            var listFiles = function() {
                $scope.files = [];                
                $scope.group.playlists.forEach(function(groupPlList) {
                    var itemIndex = $scope.playlists.indexOf(groupPlList.name);
                    if(itemIndex != -1) {
                        $scope.playlistsObj[itemIndex].assets.forEach(function(asset) {
                            if ($scope.files.indexOf(asset.filename) == -1){
                                $scope.files.push(asset.filename);
                                if (asset.side)
                                    $scope.files.push(asset.side);
                                if (asset.bottom)
                                    $scope.files.push(asset.bottom);
                            }
                        });
                        if($scope.files.indexOf('__'+groupPlList.name+'.json') == -1)
                            $scope.files.push('__'+groupPlList.name+'.json');
                    }
                });
                $scope.group.assets = $scope.files;
            }

            $http.get(piUrls.groups+ $stateParams.group,{})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.group = data.data;
                        $scope.files = $scope.group.assets;                        
                        if(!$scope.group.playlists.length)
                            $scope.group.playlists.push({name:''});
                        else if (!$scope.group.playlists[0].name)    //backward compatibilty
                            $scope.group.playlists[0] = {name: $scope.group.playlists[0]};
                    }
                    $http
                        .get(piUrls.playlists, {})
                        .success(function(data, status) {
                            if (data.success) {                                
                                $scope.playlistsObj = data.data;
                                $scope.playlists = $scope.playlistsObj.map(function(playlist){
                                    return (playlist.name)
                                });
                            }
                            listFiles();
                        })
                        .error(function(data, status) {
                        });
                })
                .error(function(data, status) {
                });
            
            $scope.deploy = function() {
                $scope.group.orientation = $scope.group.orientation || 'landscape';
                $scope.group.resolution = $scope.group.resolution || '720p';
                $scope.group.assets = $scope.files;
                $scope.group.deploy = true;
                $http.post(piUrls.groups+ $stateParams.group,$scope.group)
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.msg = {msg: 'Deployed! Request has been sent to all Players.', title: 'Deploy'};
                            $scope.group = data.data;
                        } else {
                            $scope.msg = {msg: data.stat_message, title: 'Deploy Failed'};
                        }
                        $scope.deployOk = $modal.open({
                            templateUrl: '/app/templates/statusPopup.html',
                            scope: $scope,
                            keyboard: false,
                            backdrop: 'static'
                        });
                    })
                    .error(function(data, status) {
                    });
            }
            
            $scope.cancel = function() {
                $scope.deployOk.close();
                $location.path('/groups');
            }
           
            var updateGroup = function(){
                $http
                    .post(piUrls.groups+ $stateParams.group,$scope.group)
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                    });
            }
            
            $scope.add= function() {                
                if ($scope.group.playlists.length >= 4) {
                    $timeout(function () {
                            $scope.showMaxErr = false;
                    }, 5000);
                    $scope.showMaxErr = true;
                    return;
                }
                $scope.group.playlists.push({name:$scope.group.playlists[0].name , settings: { startdate: '', enddate: '', starttime: '',endtime: ''} });
                updateGroup();
            }            
            
            $scope.scheduleCalendar = function(playlist) {
                $scope.forPlaylist = playlist;
                $scope.scheduleCalendarModal = $modal.open({
                    templateUrl: '/app/templates/scheduleCalendar.html',
                    scope: $scope,
                    keyboard: false
                });
                $scope.scheduleCalendarModal.result.then(function() {
                    updateGroup();
                })
            }
            
            $scope.closeModal = function() {
                $scope.scheduleCalendarModal.close();
            }
            
            $scope.saveSelection = function() {
                listFiles();
                updateGroup();
            }
           
            $scope.delete= function(index){
                piPopup.confirm("Schedule Playlist", function() {
                    $scope.group.playlists.splice(index, 1);
                    listFiles();
                    updateGroup();
                });
            }

            $scope.displaySet = function(){
                $scope.resolutions =[{value:'720p',name:"HD(720p) Video & Browser 1280x720"},
                                     {value:'1080p',name:"Full HD(1080p) Video & Browser 1920x1080"}];
                $scope.orientations =  [{value:'landscape',name:"Landscape Mode"},
                                        {value:'portrait',name:"Portrait Mode"}];
                $scope.display = {}
                if ($scope.group.resolution == $scope.resolutions[1].value)
                    $scope.display.resolution = $scope.resolutions[1];
                else
                    $scope.display.resolution = $scope.resolutions[0];

                if ($scope.group.orientation == $scope.orientations[1].value)
                    $scope.display.orientation = $scope.orientations[1];
                else
                    $scope.display.orientation = $scope.orientations[0];

                $scope.displayModal = $modal.open({
                    templateUrl: '/app/templates/displaySet.html',
                    scope: $scope,
                    keyboard: false
                });
            }
            $scope.displayModalCancel = function(){
                $scope.displayModal.close();
            }
            $scope.displayModalOk = function(){
                $scope.group.resolution = $scope.display.resolution.value;
                $scope.group.orientation = $scope.display.orientation.value;
                $scope.displayModal.close();
                updateGroup();
            }
        }])

    .controller('GroupsEditCtrl',function ($scope,$http,piUrls,Navbar,$location,piFeatures,piPopup) {

        $scope.renameFeature  = piFeatures.groupRenameFeature;

        Navbar.showPrimaryButton= true;
        Navbar.primaryButtonText = "DONE";
        Navbar.primaryButtonTypeClass= "btn-success";

        $http
            .get(piUrls.groups, {})
            .success(function(data, status) {
                if (data.success) {
                    $scope.groups= data.data;
                    $scope.groupsCopy= angular.copy($scope.groups);
                }
            })
            .error(function(data, status) {
            });


        $scope.pbHandler = function(buttonText){
            $location.path('/groups');
        }
        Navbar.primaryButtonHandler = $scope.pbHandler;

        $scope.delete= function(index){
            piPopup.confirm("Group", function() {
                $http
                    .delete(piUrls.groups + $scope.groups[index]._id)
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.groups.splice(index, 1);
                            $scope.groupsCopy.splice(index, 1);
                        }
                    })
                    .error(function (data, status) {
                    });
            })
        }

        $scope.newGroup = {
            name: "Group"
        }
        $scope.add= function(){

            if (!$scope.newGroup.name) {
                $scope.newGroup.name = "Empry name or name already exists";
                $scope.addform.$setPristine();
                $scope.fieldStatus = "has-error";
                return;
            }

            for (var i=0; i <$scope.groups.length; i++) {
                if ($scope.groups[i].name == $scope.newGroup.name) {
                    $scope.newGroup.name = "File name already exists";
                    $scope.addform.$setPristine();
                    $scope.fieldStatus = "has-error";
                    return;
                }
            }

            $http
                .post(piUrls.groups, $scope.newGroup)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.groups.push(data.data);
                        $scope.groupsCopy.push(angular.copy(data.data));
                        $scope.addform.$setPristine();
                        $scope.fieldStatus = "has-success";
                    }
                })
                .error(function(data, status) {
                });
        }
    }).

    controller('GroupsItemCtrl',['$scope','$http', 'piUrls',function($scope,$http,piUrls){
        $scope.rename= function(index){
            if (!$scope.groups[index].name) {
                $scope.groups[index].name = "Empry name or name already exists";
                $scope.editform.$setPristine();
                $scope.fieldStatus = "has-error";
                return;
            }

            for (var i=0; i <$scope.groupsCopy.length; i++) {
                if ($scope.groupsCopy[i].name == $scope.groups[index].name) {
                    $scope.groups[index].name = "File name already exists";
                    $scope.editform.$setPristine();
                    $scope.fieldStatus = "has-error";
                    return;
                }
            }

            $http
                .post(piUrls.groups + $scope.groupsCopy[index]._id, $scope.groups[index])
                .success(function (data, status) {
                    if (data.success) {
                        $scope.groupsCopy[index] = $scope.groups[index];
                        $scope.editform.$setPristine();
                        $scope.fieldStatus = "has-success";
                    }
                })
                .error(function (data, status) {
                });
        }
    }])
