'use strict';

angular.module('piGroups.controllers', [])

    .controller('GroupsCtrl', function ($scope, $http, piUrls, $location, piPopup,playerLoader) {

        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            playerLoader.selectGroup()
        }

        $scope.newGroup = {}

        $scope.fn.add = function () {
            if (!$scope.newGroup.name) {
                return;
            }

            for (var i = 0; i < $scope.group.groups.length; i++) {
                if ($scope.group.groups[i].name == $scope.newGroup.name) {
                    $scope.newGroup.name = "Group exists";
                    return;
                }
            }

            $http
                .post(piUrls.groups, $scope.newGroup)
                .success(function (data, status) {
                    if (data.success) {
                        $scope.group.groups.push(data.data);
                        $scope.newGroup = {}
                    }
                })
                .error(function (data, status) {
                });
        }

        $scope.fn.delete = function (index) {
            if ($scope.fn.editMode) {
                piPopup.confirm($scope.group.groups[index].name+" Group", function () {

                    $http
                        .delete(piUrls.groups + $scope.group.groups[index]._id)
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.group.groups.splice(index, 1);
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected($scope.group.groups[index])
            }
        }

        $scope.fn.rename = function (index) {
            $scope.group.groups[index].renameEnable = false;
            if (!$scope.group.groups[index].newname ||
                ($scope.group.groups[index].name == $scope.group.groups[index].newname)) {
                return;
            }

            for (var i = 0; i < $scope.group.groups.length; i++) {
                if ($scope.group.groups[i].name == $scope.group.groups[index].newname) {
                    $scope.group.groups[index].newname = "Group exists";
                    return;
                }
            }
            var oldname = $scope.group.groups[index].name;
            $scope.group.groups[index].name = $scope.group.groups[index].newname;
            $http
                .post(piUrls.groups + $scope.group.groups[index]._id, $scope.group.groups[index])
                .success(function (data, status) {
                    if (!data.success) {
                        $scope.group.groups[index].name = oldname;
                        $scope.group.groups[index].newname = "Could not rename";
                    }
                })
                .error(function (data, status) {
                    $scope.group.groups[index].name = oldname;
                    $scope.group.groups[index].newname = "Could not rename";
                });
        }

        $scope.fn.selected = function (group) {
            if (!$scope.fn.editMode) {
                $scope.group.selectedGroup = ($scope.group.selectedGroup == group) ? null : group;
                playerLoader.selectGroup($scope.group.selectedGroup)
            } else {
                group.renameEnable = true;
                group.newname = group.name;
            }
        }

        $scope.fn.getClass = function (group) {
            if ($scope.group.selectedGroup == group) {
                return "bg-info"
            } else {
                return ""
            }
        }
    })

    .controller('GroupDetailCtrl', function ($scope, $rootScope, $http, piUrls,$state, $location, $modal,
                                                    weeks, days,playerLoader,$timeout) {

        $scope.sortable = {
            options: {
                orderChanged: function (event) {
                    $scope.updateGroup();
                }
            },
            playlistArray: []
        }

        $scope.weeklist = weeks; // get all week list and code
        $scope.dayslist = days;

        $scope.group = playerLoader.group;
        var initSortArray = function(){
            if ($state.params.group) {
                for (var i= 0,len=$scope.group.groups.length;i<len;i++) {
                    if ($state.params.group == $scope.group.groups[i]._id) {
                        $scope.group.selectedGroup = $scope.group.groups[i];
                        $scope.sortable.playlistArray = $scope.group.selectedGroup.playlists
                        break;
                    }
                }
            }
            playerLoader.getPlayers();
        }

        playerLoader.registerObserverCallback(initSortArray,"group-detail");
        initSortArray();

        $scope.updateGroup = function (cb) {
            $scope.group.selectedGroup.assets = [];
            for (var i=$scope.group.selectedGroup.playlists.length -1;i>=0;i--) {
                if ($scope.group.selectedGroup.playlists[i].name && $scope.group.selectedGroup.playlists[i].name.length > 0) {
                    var playlist = $scope.playlist.playlists[$scope.playlist.playlistNames.indexOf($scope.group.selectedGroup.playlists[i].name)];
                    playlist.assets.forEach(function (asset) {
                        if (asset.filename.indexOf("_system") == 0)  //system files, no need to copy
                            return;
                        if (asset.filename && $scope.group.selectedGroup.assets.indexOf(asset.filename) == -1
                                            && asset.filename.indexOf("_system") != 0) {
                            $scope.group.selectedGroup.assets.push(asset.filename);
                        }
                        if (asset.side && $scope.group.selectedGroup.assets.indexOf(asset.side) == -1
                                            && asset.side.indexOf("_system") != 0) {
                            $scope.group.selectedGroup.assets.push(asset.side);
                        }
                        if (asset.bottom && $scope.group.selectedGroup.assets.indexOf(asset.bottom) == -1
                                            && asset.bottom.indexOf("_system") != 0) {
                            $scope.group.selectedGroup.assets.push(asset.bottom);
                        }
                    });
                    if ($scope.group.selectedGroup.assets.indexOf('__' + playlist.name + '.json') == -1)
                        $scope.group.selectedGroup.assets.push('__' + playlist.name + '.json');
                } else {
                    $scope.group.selectedGroup.playlists.splice(i,1);
                }
            }

            $http
                .post(piUrls.groups + $state.params.group, $scope.group.selectedGroup)
                .success(function (data, status) {
                    if (data.success) {
                        $scope.group.selectedGroup = data.data;
                    }
                    if (cb)
                        cb(!data.success,data.stat_message)
                })
                .error(function (data, status) {
                    if (cb)
                        cb(true)
                })
                .finally(function(){
                    initSortArray();
                });
        }

        $scope.add = function () {
            if ($scope.group.selectedGroup.playlists.length >= 10) {
                $timeout(function () {
                    $scope.showMaxErr = false;
                }, 5000);
                $scope.showMaxErr = true;
                return;
            }
            //$scope.deployform.$setDirty(); //  inform user  of new changes
            $scope.group.selectedGroup.playlists.push({
                name: $scope.group.selectedGroup.playlists[0].name ,
                settings: {durationEnable: false, timeEnable: false, weekday: 0, monthday: 0}
            });
            $scope.updateGroup();
        }

        $scope.delete = function (index) {
            //piPopup.confirm("Playlist from Group", function () {
                $scope.group.selectedGroup.playlists.splice(index, 1);
                //$scope.deployform.$setDirty(); //  inform user  of new changes
                $scope.updateGroup();
            //});
        }

        $scope.scheduleCalendar = function (playlist) {
            $scope.forPlaylist = playlist;
            if ($scope.forPlaylist.settings) {
                if ($scope.forPlaylist.settings.startdate) {
                    $scope.forPlaylist.settings.startdate = new Date($scope.forPlaylist.settings.startdate)
                }
                if ($scope.forPlaylist.settings.enddate) {
                    $scope.forPlaylist.settings.enddate = new Date($scope.forPlaylist.settings.enddate)
                }
                if ($scope.forPlaylist.settings.starttimeObj) {
                    $scope.forPlaylist.settings.starttimeObj = new Date($scope.forPlaylist.settings.starttimeObj)
                }
                if ($scope.forPlaylist.settings.endtimeObj) {
                    $scope.forPlaylist.settings.endtimeObj = new Date($scope.forPlaylist.settings.endtimeObj)
                }
            }
            $scope.scheduleCalendarModal = $modal.open({
                templateUrl: '/app/templates/schedule-calendar.html',
                scope: $scope
            });
        }

        $scope.saveSchedules = function(formcontroller) {
            //formcontroller.$dirty? $scope.deployform.$setDirty(): ''; //  inform user  of new changes
            $scope.scheduleCalendarModal.close();
            if ($scope.forPlaylist.settings) {
                if ($scope.forPlaylist.settings.starttimeObj) {
                    var time = $scope.forPlaylist.settings.starttimeObj.toTimeString().split(' ')[0].slice(0,5)
                    $scope.forPlaylist.settings.starttime = time;
                }
                if ($scope.forPlaylist.settings.endtimeObj) {
                    var time = $scope.forPlaylist.settings.endtimeObj.toTimeString().split(' ')[0].slice(0,5)
                    $scope.forPlaylist.settings.endtime = time;
                }
            }
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
            for (var i = $scope.group.selectedGroup.playlists.length - 1; i >= 0; i--) {
                if (!$scope.group.selectedGroup.playlists[i].name || !$scope.group.selectedGroup.playlists[i].name.length) {
                    $scope.group.selectedGroup.playlists.splice(i, 1);
                }
            }
            if (!$scope.group.selectedGroup.playlists.length)
                return;
            $scope.group.selectedGroup.orientation = $scope.group.selectedGroup.orientation || 'landscape';
            $scope.group.selectedGroup.resolution = $scope.group.selectedGroup.resolution || '720p';
            $scope.group.selectedGroup.deploy = true;
            $scope.updateGroup(function (err,msg) {
                if (!err) {
                    $scope.msg = {msg: 'Deployed! Request has been sent to all Players.', title: 'Deploy Success'};
                } else {
                    $scope.msg = {msg: msg, title: 'Deploy Failed'};
                }
                $scope.deployModal = $modal.open({
                    templateUrl: '/app/templates/status-popup.html',
                    scope: $scope
                });
            })
        }
        $scope.closeWindow = function () {
            playerLoader.selectGroup();
        };
    })

    .controller('ServerPlayerCtrl', function($scope,$http,piUrls,$interval,$modal,TZNames, playerLoader,commands) {
        $scope.player = playerLoader.player;
        $scope.group = playerLoader.group;
        $scope.playlist = playerLoader.playlist;
        $scope.tzNames = TZNames;

        $scope.assignGroup = function(player) {
            if (player.group.name) {
                player.group = $scope.group.groups[$scope.group.groupNames.indexOf(player.group.name)];
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

        $scope.changeTZ = function(player) {
            $http.post(piUrls.players+player._id,{TZ:player.TZ})
                .success(function(data, status) {
                    if (data.success) {
                        player = data.data;
                    }
                })
                .error(function(data, status) {
                });
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
            commands.save($scope.msg.cmd); // save commands

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
            $scope.msg = {player:player,curVer:player.version,newVer:$scope.player.currentVersion.version};
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

        $scope.getOldEntry = function(event){ // handle every key-press event to check and  save commands
            if(event.keyCode == 38)
                $scope.msg.cmd = commands.previous();
            else if(event.keyCode == 40)
                $scope.msg.cmd = commands.next();
        }


        $interval(playerLoader.getPlayers,60000);
    })



