'use strict';

angular.module('piGroups.controllers', [])

    .factory('GroupTab', function () {
        var obj = {
            selectedGroup: null
        }
        return (obj)
    })

    .controller('GroupsCtrl', function ($scope, $stateParams, $http, piUrls, GroupTab, $location, piPopup) {


        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            GroupTab.selectedGroup = null;
        }

        $http.get(piUrls.groups, {})
            .success(function (data, status) {
                if (data.success) {
                    $scope.groups = data.data;
                    if ($stateParams.group) {
                        for (var i = 0, len = $scope.groups.length; i < len; i++) {
                            if ($scope.groups[i]._id == $stateParams.group) {
                                $scope.fn.selected($scope.groups[i])
                                break;
                            }
                        }
                    } else {
                        $scope.fn.selected($scope.groups[0])
                    }
                }
            })
            .error(function (data, status) {
            });

        $scope.newGroup = {}

        $scope.fn.add = function () {
            if (!$scope.newGroup.name) {
                return;
            }

            for (var i = 0; i < $scope.groups.length; i++) {
                if ($scope.groups[i].name == $scope.newGroup.name) {
                    $scope.newGroup.name = "Group exists";
                    return;
                }
            }

            $http
                .post(piUrls.groups, $scope.newGroup)
                .success(function (data, status) {
                    if (data.success) {
                        $scope.groups.push(data.data);
                        $scope.newGroup = {}
                    }
                })
                .error(function (data, status) {
                });
        }

        $scope.fn.delete = function (index) {
            if ($scope.fn.editMode) {
                piPopup.confirm($scope.groups[index].name+" Group", function () {

                    $http
                        .delete(piUrls.groups + $scope.groups[index]._id)
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.groups.splice(index, 1);
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
            $scope.groups[index].renameEnable = false;
            if (!$scope.groups[index].newname ||
                ($scope.groups[index].name == $scope.groups[index].newname)) {
                return;
            }

            for (var i = 0; i < $scope.groups.length; i++) {
                if ($scope.groups[i].name == $scope.groups[index].newname) {
                    $scope.groups[index].newname = "Group exists";
                    return;
                }
            }
            var oldname = $scope.groups[index].name;
            $scope.groups[index].name = $scope.groups[index].newname;
            $http
                .post(piUrls.groups + $scope.groups[index]._id, $scope.groups[index])
                .success(function (data, status) {
                    if (!data.success) {
                        $scope.groups[index].name = oldname;
                        $scope.groups[index].newname = "Could not rename";
                    }
                })
                .error(function (data, status) {
                    $scope.groups[index].name = oldname;
                    $scope.groups[index].newname = "Could not rename";
                });
        }

        $scope.fn.selected = function (group) {
            if (!$scope.fn.editMode) {
                GroupTab.selectedGroup = (GroupTab.selectedGroup == group) ? null : group;
            } else {
                group.renameEnable = true;
                group.newname = group.name;
            }

            if (GroupTab.selectedGroup)
                $location.path("/players/players/" + group._id);
            else
                $location.path("/players/players");
        }

        $scope.fn.getClass = function (group) {
            if (GroupTab.selectedGroup == group) {
                return "bg-info"
            } else {
                return ""
            }
        }
    })

    .controller('GroupDetailCtrl', function ($scope, $rootScope, $http, piUrls, $stateParams, $location, $modal, weeks, days) {

        $scope.weeklist = weeks; // get all week list and code
        $scope.dayslist = days;

        $scope.collapsed = true;
        var showEmptySlots = function(){
            $scope.group.playlists = $scope.group.playlists || [];
            var len = 11 - $scope.group.playlists.length;
            if (len <=2)
                $scope.collapsed = false;
            for (var i= 0; i< len;i++){
                $scope.group.playlists.push({
                    name: '',
                    settings: { durationEnable: false, timeEnable: false, weekday: 0, monthday: 0}
                });
            }
        }

        $http.get(piUrls.groups + $stateParams.group, {})
            .success(function (data, status) {
                if (data.success) {
                    $scope.group = data.data;
                    showEmptySlots();
                }
            })
            .error(function (data, status) {
            });

        $http
            .get(piUrls.playlists, {})
            .success(function (data, status) {
                if (data.success) {
                    $scope.playlists = data.data;
                    $scope.playlistNames = $scope.playlists.map(function(playlist){
                        return playlist.name;
                    });
                }
            })
            .error(function (data, status) {
            });

        $scope.updateGroup = function () {
            $scope.group.assets = [];
            for (var i=$scope.group.playlists.length -1;i>=0;i--) {
                if ($scope.group.playlists[i].name && $scope.group.playlists[i].name.length > 0) {
                    var playlist = $scope.playlists[$scope.playlistNames.indexOf($scope.group.playlists[i].name)];
                    playlist.assets.forEach(function (asset) {
                        if (asset.filename && $scope.group.assets.indexOf(asset.filename) == -1) {
                            $scope.group.assets.push(asset.filename);
                        }
                        if (asset.side && $scope.group.assets.indexOf(asset.side) == -1) {
                            $scope.group.assets.push(asset.side);
                        }
                        if (asset.bottom && $scope.group.assets.indexOf(asset.bottom) == -1) {
                            $scope.group.assets.push(asset.bottom);
                        }
                    });
                    if ($scope.group.assets.indexOf('__' + playlist.name + '.json') == -1)
                        $scope.group.assets.push('__' + playlist.name + '.json');
                } else {
                    $scope.group.playlists.splice(i,1);
                }
            }

            $http
                .post(piUrls.groups + $stateParams.group, $scope.group)
                .success(function (data, status) {
                    if (data.success) {
                    }
                    showEmptySlots();
                })
                .error(function (data, status) {
                    showEmptySlots();
                });
        }

        $scope.add = function () {
            $scope.deployform.$setDirty(); //  inform user  of new changes
            $scope.group.playlists.push({
                name: $scope.newPlaylistName,
                settings: {durationEnable: false, timeEnable: false, weekday: 0, monthday: 0}
            });
            $scope.updateGroup();
        }

        $scope.delete = function (index) {
            //piPopup.confirm("Playlist from Group", function () {
                //$scope.group.playlists.splice(index, 1);
                $scope.deployform.$setDirty(); //  inform user  of new changes
                $scope.group.playlists[index] =  {
                    name: '',
                    settings: {durationEnable: false, timeEnable: false, weekday: 0, monthday: 0}
                };
                $scope.updateGroup();
            //});
        }

        $scope.scheduleCalendar = function (playlist) {
            $scope.forPlaylist = playlist;
            $scope.scheduleCalendarModal = $modal.open({
                templateUrl: '/app/templates/schedule-calendar.html',
                scope: $scope
            });
        }

        $scope.saveSchedules = function(formcontroller) {
            formcontroller.$dirty? $scope.deployform.$setDirty(): ''; //  inform user  of new changes
            $scope.scheduleCalendarModal.close();
            $scope.updateGroup();
        }

        $scope.displaySet = function () {
            $scope.resolutions = [
                {value: '720p', name: "HD(720p) Video & Browser 1280x720"},
                {value: '1080p', name: "Full HD(1080p) Video & Browser 1920x1080"}
            ];

            $scope.orientations = [
                {value: 'landscape', name: "Landscape Mode"},
                {value: 'portrait', name: "Portrait Mode"}
            ];

            $scope.animations = [
                {value: false, name: 'Disable Animation'},
                {value: true, name: 'Enable Animation'}
            ];

            $scope.displayModal = $modal.open({
                templateUrl: '/app/templates/display-set.html',
                scope: $scope
            });

        }
        $scope.saveSettings = function () {
            $scope.displayModal.close();
            $scope.updateGroup();
        }

        $scope.deploy = function () {
            for (var i=$scope.group.playlists.length -1;i>=0;i--) {
                if (!$scope.group.playlists[i].name || !$scope.group.playlists[i].name.length) {
                    $scope.group.playlists.splice(i, 1);
                }
            }
            if (!$scope.group.playlists.length)
                return;
            $scope.group.orientation = $scope.group.orientation || 'landscape';
            $scope.group.resolution = $scope.group.resolution || '720p';
            $scope.group.deploy = true;
            $http.post(piUrls.groups + $stateParams.group, $scope.group)
                .success(function (data, status) {
                    if (data.success) {
                        $scope.msg = {msg: 'Deployed! Request has been sent to all Players.', title: 'Deploy Success'};
                        $scope.group = data.data;
                    } else {
                        $scope.msg = {msg: data.stat_message, title: 'Deploy Failed'};
                    }
                    $scope.deployModal = $modal.open({
                        templateUrl: '/app/templates/status-popup.html',
                        scope: $scope
                    });
                    showEmptySlots();
                })
                .error(function (data, status) {
                    showEmptySlots();
                });
        }
    })

    .controller('ServerPlayerCtrl', function($scope,$http,piUrls,$stateParams,$interval,$modal,TZNames) {

        var getPlayers = function() {
            var options;
            $http.get(piUrls.players, options)
                .success(function (data, status) {
                    if (data.success) {
                        $scope.players = data.data.objects;
                        $scope.currentVersion = data.data.currentVersion;
                        $scope.players.forEach(function(player){
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
                })
                .error(function (data, status) {
                });
        }
        $scope.tzNames = TZNames;

        $http
            .get(piUrls.groups, {})
            .success(function(data, status) {
                if (data.success) {
                    $scope.groupObj = data.data;
                    $scope.groups= $scope.groupObj.map(function(group){
                        return (group.name)
                    });
                    getPlayers();
                }
            })
            .error(function(data, status) {
                getPlayers();
            });

        $scope.assignGroup = function(player) {
            if (player.group.name) {
                player.group = $scope.groupObj[$scope.groups.indexOf(player.group.name)];
                $http.post(piUrls.players+player._id,{group:player.group})
                    .success(function(data, status) {
                        if (data.success) {
                            player = data.data;
                        }
                    })
                    .error(function(data, status) {
                    });
            }
        }

        $scope.shellCommand = function(player) {
            if (player.statusClass == "text-danger")
                return console.log("Player is offline");
            $scope.msg = {player:player,cmd:'',err:"Type a shell command..."};
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/shell-popup.html',
                scope: $scope
            });
        }

        $scope.execute = function() {
            $scope.msg.err = "Please wait..."
            $scope.msg.stderr = null;
            $scope.msg.stdout = null;
            $http
                .post(piUrls.pishell+$scope.msg.player._id, {cmd: $scope.msg.cmd})
                .success(function(data, status) {
                    $scope.msg.err = data.data.err;
                    $scope.msg.stderr = data.data.stderr;
                    $scope.msg.stdout = data.data.stdout;
                })
                .error(function(data, status) {
                });
        }

        $scope.swUpdate = function(player) {
            if (player.statusClass == "text-danger")
                return console.log("Player is offline");
            $scope.msg = {player:player,curVer:player.version,newVer:$scope.currentVersion.version};
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/swupdate-popup.html',
                scope: $scope
            });
        }

        $scope.confirmUpdate = function() {
            $http
                .post(piUrls.swupdate+$scope.msg.player._id, {})
                .success(function(data, status) {
                    $scope.modal.close();
                })
                .error(function(data, status) {
                });
        }

        $interval(getPlayers,60000);
    })



