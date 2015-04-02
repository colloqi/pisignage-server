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
                $location.path("/players/" + group._id);
            else
                $location.path("/players");
        }

        $scope.fn.getClass = function (group) {
            if (GroupTab.selectedGroup == group) {
                return "bg-info"
            } else {
                return ""
            }
        }
    })

    .controller('GroupDetailCtrl', function ($scope, $rootScope, $http, piUrls, $stateParams, $location, $modal, piPopup, $timeout) {

        $http.get(piUrls.groups + $stateParams.group, {})
            .success(function (data, status) {
                if (data.success) {
                    $scope.group = data.data;
                }
            })
            .error(function (data, status) {
            });
        $http
            .get(piUrls.playlists, {})
            .success(function (data, status) {
                if (data.success) {
                    $scope.playlists = data.data;
                }
            })
            .error(function (data, status) {
            });

        var updateGroup = function () {
            $scope.group.playlists.forEach(function (playlist) {
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
            });

            $http
                .post(piUrls.groups + $stateParams.group, $scope.group)
                .success(function (data, status) {
                    if (data.success) {
                    }
                })
                .error(function (data, status) {
                });
        }

        $scope.add = function () {
            $scope.group.playlists.push({
                name: $scope.newPlaylistName,
                settings: {startdate: null, enddate: null, starttime: null, endtime: null}
            });
            updateGroup();
        }

        $scope.delete = function (index) {
            piPopup.confirm("Playlist from Group", function () {
                $scope.group.playlists.splice(index, 1);
                updateGroup();
            });
        }

        $scope.scheduleCalendar = function (playlist) {
            $scope.forPlaylist = playlist;
            $scope.scheduleCalendarModal = $modal.open({
                templateUrl: '/app/templates/schedule-calendar.html',
                scope: $scope
            });
        }

        $scope.saveSchedules = function() {
            $scope.scheduleCalendarModal.close();
            updateGroup();
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

            $scope.displayModal = $modal.open({
                templateUrl: '/app/templates/display-set.html',
                scope: $scope
            });
        }
        $scope.saveSettings = function () {
            $scope.displayModal.close();
            updateGroup();
        }

        $scope.deploy = function () {
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
                    $scope.deployOk = $modal.open({
                        templateUrl: '/app/templates/status-popup.html',
                        scope: $scope
                    });
                })
                .error(function (data, status) {
                });
        }

        $scope.cancel = function () {
            $scope.deployOk.close();
        }
    })


