'use strict';

angular.module('piGroups.controllers', [])

    .controller('GroupsCtrl', function ($scope, $http,$sce, piUrls, $location, piPopup,$modal,playerLoader,piConstants,GroupFunctions) {

        
        
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
            $scope.newGroup.name = $scope.newGroup.name.replace(piConstants.groupNameRegEx,'');

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
                        $scope.group.groups.unshift(data.data);
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

        var deployToAll = function (groups) { // global sync
            var errMessages = [],
                error = false;
            async.each(groups, function (group, next) {
                GroupFunctions.listFiles(group, $scope.playlistsObj, $scope.playlists, function (err, groupObj) {
                    groupObj.deploy = true;
                    $http
                        .post(piUrls.groups + group._id, groupObj)
                        .then(function (response) {
                            var data = response.data;
                            if (!data.success && group.name.indexOf("__player__") != 0) {
                                errMessages.push("*** " + ("Deploy failed for ") + group.name + ", " + ('reason: ') + data.stat_message);
                                //piPopup.status({msg: "Did not deply for "+ group.name + " reason: "+data.stat_message,
                                //    title: ('Deploy ')});
                            } else {
                                errMessages.push(("Deploy done for ") + group.name);
                            }
                            next();
                        }, function (response) {
                            errMessages.push("*** " + ("Deploy failed for ") + group.name + ", " + ("reason: http post error"));
                            next();
                        });
                })
            }, function (err) {
                var msg = errMessages.join("\n\n")
                piPopup.status({msg: msg, title: 'Deploy '});
            })
        }

        $scope.globalSync = function () {
            $http
                .get(piUrls.playlists, {})
                .then(function (response) {
                    var data = response.data;
                    if (data.success) {
                        $scope.playlistsObj = data.data;
                        $scope.playlists = $scope.playlistsObj.map(function (playlist) {
                            return (playlist.name)
                        });
                        $http.get(piUrls.groups, {params: {all: "all"}})
                            .then(function (response) {
                                var data = response.data;
                                if (data.success) {
                                    deployToAll(data.data);
                                }
                            }, function (response) {
                            });
                    } else {
                        console.log('error in getting playlist details' + data.stat_message);
                    }

                }, function (response) {
                    console('error in getting playlist details' + response.status);
                });
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

    .controller('GroupDetailCtrl', function ($scope, $rootScope, $http, piUrls,$state, $modal,
                                                    weeks, days,weeksObject,daysObject,playerLoader,$timeout,GroupFunctions,piPopup) {

        //make sure state.params.group is set
        if ($scope.group.selectedGroup && !($state.params.group)) {
            playerLoader.selectGroup($scope.group.selectedGroup)
        }

        $scope.sortable = {
            options: {
                orderChanged: function (event) {
                    $scope.updateGroup();
                    $scope.needToDeploy = true;
                }
            },
            playlistArray: []
        }

        $scope.weeklist = weeks; // get all week list and code
        $scope.dayslist = days;
        $scope.needToDeploy = false;

        $scope.group = playerLoader.group;
        var initSortArray = function(){
            if ($state.params.group) {
                for (var i= 0,len=$scope.group.groups.length;i<len;i++) {
                    if ($state.params.group == $scope.group.groups[i]._id) {
                        if(!$scope.tempPopup){
                            $scope.group.selectedGroup = $scope.group.groups[i];
                        }
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
            $scope.needToDeploy = true;
            GroupFunctions.listFiles($scope.group.selectedGroup, $scope.playlist.playlists, $scope.playlist.playlistNames, function (err, groupObj) {
                $scope.deployErrorMessage = err;
                $scope.group.selectedGroup = groupObj;
                $http
                    .post(piUrls.groups + $state.params.group, $scope.group.selectedGroup)
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.group.selectedGroup = data.data;
                            $scope.group.selectedGroup.omxVolume =
                                ($scope.group.selectedGroup.omxVolume ||
                                    $scope.group.selectedGroup.omxVolume == 0)?$scope.group.selectedGroup.omxVolume:100;
                            $scope.showDates()
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
            })
        }

        $scope.add = function () {
            if ($scope.group.selectedGroup.playlists.length >= 100) {
                $timeout(function () {
                    $scope.showMaxErr = false;
                }, 5000);
                $scope.showMaxErr = true;
                return;
            }
            //$scope.deployform.$setDirty(); //  inform user  of new changes
            $scope.group.selectedGroup.playlists.unshift({
                name: $scope.group.selectedGroup.playlistToSchedule || $scope.group.selectedGroup.playlists[0].name ,
                settings: { durationEnable: false, timeEnable: false}
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

        $scope.weekDaysText = {}
        $scope.monthDaysText = {}
        $scope.showDates = function() {
            for (var i=1,len=$scope.group.selectedGroup.playlists.length;i<len;i++) {
                var playlist = $scope.group.selectedGroup.playlists[i]
                if (!playlist.settings || !playlist.settings.weekdays || playlist.settings.weekdays.length >= 7)
                    $scope.weekDaysText[i] = ""
                else if (playlist.settings.weekdays.length > 0) {
                    $scope.weekDaysText[i] = "week days: "
                    playlist.settings.weekdays.forEach(function (day) {
                        $scope.weekDaysText[i] = $scope.weekDaysText[i] +
                            " " + $scope.ngDropdown.weekdays.list[day - 1].label.slice(0, 2)
                    })
                } else {
                    $scope.weekDaysText[i] = "Not Scheduled"
                }
                if (!playlist.settings || !playlist.settings.monthdays || playlist.settings.monthdays.length >= 31)
                    $scope.monthDaysText[i] = ""
                else if (playlist.settings.monthdays.length > 0) {
                    $scope.monthDaysText[i] = "dates: "
                    playlist.settings.monthdays.forEach(function (day) {
                        $scope.monthDaysText[i] = $scope.monthDaysText[i] + day + ','
                    })
                } else {
                    $scope.monthDaysText[i] = "Not Scheduled"
                }
            }
        }


        $scope.scheduleCalendar = function (playlist) {
            var getHoursMinutes = function(timeString) {
                var hhmmArray = timeString.split(':');
                if (hhmmArray.length == 2)
                    return ({h:parseInt(hhmmArray[0]),m: parseInt(hhmmArray[1])});
                else if (hhmmArray.length == 1)
                    return ({h:0,m: parseInt(hhmmArray[0])});
                else if (hhmmArray.length > 2)
                    return ({h:parseInt(hhmmArray[hhmmArray.length -2]),m: parseInt(hhmmArray[hhmmArray.length -1])});
            }

            $scope.forPlaylist = playlist;
            if (!$scope.forPlaylist.settings.weekdays &&
                $scope.forPlaylist.settings.weekday &&
                $scope.forPlaylist.settings.weekday != 0
            )
                $scope.forPlaylist.settings.weekdays = [$scope.forPlaylist.settings.weekday]
            else if (!$scope.forPlaylist.settings.weekdays) {
                $scope.forPlaylist.settings.weekdays = $scope.ngDropdown.weekdays.list.map(function(obj){
                    return obj.id
                })
            }
            $scope.ngDropdown.weekdays.selectedDays = $scope.ngDropdown.weekdays.list.filter(function(obj){
                if ($scope.forPlaylist.settings.weekdays.indexOf(obj.id) >= 0)
                    return true;
                else
                    return false;
            })

            if (!$scope.forPlaylist.settings.monthdays &&
                $scope.forPlaylist.settings.monthday &&
                $scope.forPlaylist.settings.monthday != 0
            )
                $scope.forPlaylist.settings.monthdays = [$scope.forPlaylist.settings.monthday]
            else if (!$scope.forPlaylist.settings.monthdays) {
                $scope.forPlaylist.settings.monthdays = $scope.ngDropdown.monthdays.list.map(function(obj){
                    return obj.id
                })
            }
            $scope.ngDropdown.monthdays.selectedDays = $scope.ngDropdown.monthdays.list.filter(function(obj){
                if ($scope.forPlaylist.settings.monthdays.indexOf(obj.id) >= 0)
                    return true;
                else
                    return false;
            })

            if ($scope.forPlaylist.settings) {
                if ($scope.forPlaylist.settings.startdate) {
                    $scope.forPlaylist.settings.startdate = new Date($scope.forPlaylist.settings.startdate)
                }
                if ($scope.forPlaylist.settings.enddate) {
                    $scope.forPlaylist.settings.enddate = new Date($scope.forPlaylist.settings.enddate)
                }
                $scope.today = new Date().toISOString().split("T")[0];
                $scope.$watch("forPlaylist.settings.startdate", function(value) {
                    if (value) {
                        var endday = new Date(value);
                        $scope.endday = endday.toISOString().split("T")[0];
                        if (!$scope.forPlaylist.settings.enddate ||
                            value > $scope.forPlaylist.settings.enddate)
                            $scope.forPlaylist.settings.enddate = endday;
                    }
                });
                
                // if ($scope.forPlaylist.settings.starttimeObj) {
                //     $scope.forPlaylist.settings.starttimeObj = new Date($scope.forPlaylist.settings.starttimeObj)
                // }
                // if ($scope.forPlaylist.settings.endtimeObj) {
                //     $scope.forPlaylist.settings.endtimeObj = new Date($scope.forPlaylist.settings.endtimeObj)
                // }
                if ($scope.forPlaylist.settings.starttime) {
                    $scope.forPlaylist.settings.starttimeObj = new Date(0)
                    var t = getHoursMinutes($scope.forPlaylist.settings.starttime)
                    $scope.forPlaylist.settings.starttimeObj.setHours(t.h)
                    $scope.forPlaylist.settings.starttimeObj.setMinutes(t.m)
                }
                if ($scope.forPlaylist.settings.endtime) {
                    $scope.forPlaylist.settings.endtimeObj = new Date(0)
                    var t = getHoursMinutes($scope.forPlaylist.settings.endtime)
                    $scope.forPlaylist.settings.endtimeObj.setHours(t.h)
                    $scope.forPlaylist.settings.endtimeObj.setMinutes(t.m)
                }

            }
            $scope.scheduleCalendarModal = $modal.open({
                templateUrl: '/app/templates/schedule-calendar.html',
                scope: $scope
            });
            $scope.scheduleCalendarModal.result.finally(function() {
                //for backward compatibility
                if (playlist.settings.weekdays && playlist.settings.weekdays.length < 7)
                    $scope.forPlaylist.settings.weekday = $scope.forPlaylist.settings.weekdays[0]
                else
                    delete $scope.forPlaylist.settings.weekday
                if (playlist.settings.monthdays && playlist.settings.monthdays.length < 31)
                    $scope.forPlaylist.settings.monthday = $scope.forPlaylist.settings.monthdays[0]
                else
                    delete $scope.forPlaylist.settings.monthday
                $scope.showDates()
                if ($scope.forPlaylist.settings) {
                    // if ($scope.forPlaylist.settings.starttimeObj) {
                    //     var time = $scope.forPlaylist.settings.starttimeObj.toTimeString().split(' ')[0].slice(0,5)
                    //     $scope.forPlaylist.settings.starttime = time;
                    // }
                    // if ($scope.forPlaylist.settings.endtimeObj) {
                    //     var time = $scope.forPlaylist.settings.endtimeObj.toTimeString().split(' ')[0].slice(0,5)
                    //     $scope.forPlaylist.settings.endtime = time;
                    // }
                    var minutes,hours;
                    if ($scope.forPlaylist.settings.starttimeObj) {
                        hours = $scope.forPlaylist.settings.starttimeObj.getHours()
                        $scope.forPlaylist.settings.starttime = (hours < 10)?("0"+hours):(""+hours);
                        minutes = $scope.forPlaylist.settings.starttimeObj.getMinutes();
                        $scope.forPlaylist.settings.starttime += (minutes < 10)?(":0"+minutes):":"+minutes;
                    }
                    if ($scope.forPlaylist.settings.endtimeObj) {
                        hours = $scope.forPlaylist.settings.endtimeObj.getHours()
                        $scope.forPlaylist.settings.endtime = (hours < 10)?("0"+hours):(""+hours);
                        minutes = $scope.forPlaylist.settings.endtimeObj.getMinutes();
                        $scope.forPlaylist.settings.endtime += (minutes < 10)?(":0"+minutes):":"+minutes;
                    }
                }

                $scope.updateGroup();
                //formcontroller.$dirty? $scope.deployform.$setDirty(): ''; //  inform user  of new changes
            })
        }

        $scope.ngDropdown = {
            weekdays: {
                list:weeksObject,
                selectedDays: [],
                extraSettings: {
                    smartButtonMaxItems:7,
                    smartButtonTextConverter: function(itemText, originalItem) {
                        return itemText.slice(0,2);
                    },
                    displayProp: 'label', idProp: 'id', externalIdProp: 'id',
                    //scrollableHeight: '200px', scrollable: true,
                    showCheckAll: true, showUncheckAll: true,
                    buttonClasses: "btn btn-default group-multiselect"
                },
                customTexts: {buttonDefaultText: "Select Days"},
                events: {
                    onSelectAll: function () {
                        $scope.forPlaylist.settings.weekdays = $scope.ngDropdown.weekdays.list.map(function(obj){
                            return obj.id
                        })
                    },
                    onDeselectAll: function () {
                        $scope.forPlaylist.settings.weekdays = []
                    },
                    onItemSelect: function (day) {
                        if ($scope.forPlaylist.settings.weekdays.indexOf(day.id) == -1)
                            $scope.forPlaylist.settings.weekdays.push(day.id)
                    },
                    onItemDeselect: function (day) {
                        $scope.forPlaylist.settings.weekdays.splice(
                            $scope.forPlaylist.settings.weekdays.indexOf(day.id),1)
                    }
                }
            },
            monthdays: {
                list:daysObject,
                selectedDays: [],
                extraSettings: {
                    smartButtonMaxItems:7,
                    displayProp: 'label', idProp: 'id', externalIdProp: 'id',
                    //scrollableHeight: '200px', scrollable: true,
                    showCheckAll: true, showUncheckAll: true,
                    buttonClasses: "btn btn-default group-multiselect"
                },
                customTexts: {buttonDefaultText: "Select Days"},
                events: {
                    onSelectAll: function () {
                        $scope.forPlaylist.settings.monthdays = $scope.ngDropdown.monthdays.list.map(function(obj){
                            return obj.id
                        })
                    },
                    onDeselectAll: function () {
                        $scope.forPlaylist.settings.monthdays = []
                    },
                    onItemSelect: function (day) {
                        if ($scope.forPlaylist.settings.monthdays.indexOf(day.id) == -1)
                            $scope.forPlaylist.settings.monthdays.push(day.id)
                    },
                    onItemDeselect: function (day) {
                        $scope.forPlaylist.settings.monthdays.splice(
                            $scope.forPlaylist.settings.monthdays.indexOf(day.id),1)
                    }
                }
            }
        }

        $scope.saveSchedules = function(formcontroller) {
            $scope.scheduleCalendarModal.close();
        }

        $scope.tempPopup;

        $scope.displaySet = function () {

            $scope.tempPopup = JSON.parse(JSON.stringify($scope.group.selectedGroup));

            $scope.resolutions = [
                {value: 'auto', name: "Auto based on TV settings(EDID)"},
                {value: '1080p', name: "Full HD(1080p) Video & Browser 1920x1080"},
                {value: '720p', name: "HD(720p) Video & Browser 1280x720"},
                {value: 'PAL',name: 'PAL (RCA), 720x576 Video and Browser'},
                {value: 'NTSC',name: 'NTSC (RCA), 720x480 Video and Browser' }
            ];

            $scope.orientations = [
                {value: 'landscape', name: "Landscape Mode"},
                {value: 'portrait', name: "Portrait Right (Hardware)"},
                {value: 'portrait270', name: "Portrait Left (Hardware)"}
            ];

            $scope.tempPopup.monitorArrangement = $scope.tempPopup.monitorArrangement || {};
            $scope.tempPopup.monitorArrangement.mode = $scope.tempPopup.monitorArrangement.mode || "mirror" ;
            $scope.tempPopup.monitorArrangement.reverse = $scope.tempPopup.monitorArrangement.reverse || false ;

            $scope.tempPopup.kioskUi = $scope.tempPopup.kioskUi || {enable: false}
            $scope.tempPopup.showClock = $scope.tempPopup.showClock || {enable: false}
            $scope.tempPopup.showClock.format = $scope.tempPopup.showClock.format || "12";
            $scope.tempPopup.showClock.position = $scope.tempPopup.showClock.position || "bottom";

            $scope.tempPopup.videoSize = $scope.tempPopup.videoKeepAspect ? 1 : 2 ;
            $scope.tempPopup.imageSize = $scope.tempPopup.resizeAssets ? ($scope.tempPopup.imageLetterboxed?1:2) : 0;

            $scope.tempPopup.selectedVideoPlayer = $scope.tempPopup.selectedVideoPlayer || "default"
            if ($scope.tempPopup.enableMpv == true)
                $scope.tempPopup.selectedVideoPlayer = "mpv"

            $scope.tempPopup.sleep.ontimeObj = new Date($scope.tempPopup.sleep.ontimeObj || 0)
            $scope.tempPopup.sleep.offtimeObj = new Date($scope.tempPopup.sleep.offtimeObj || 0)
            if ($scope.tempPopup.sleep && $scope.tempPopup.sleep.ontime) {
                $scope.tempPopup.sleep.ontimeObj = new Date(0)
                var t = getHoursMinutes($scope.tempPopup.sleep.ontime)
                $scope.tempPopup.sleep.ontimeObj.setHours(t.h)
                $scope.tempPopup.sleep.ontimeObj.setMinutes(t.m)
            }
            if ($scope.tempPopup.sleep && $scope.tempPopup.sleep.offtime) {
                $scope.tempPopup.sleep.offtimeObj = new Date(0)
                var t = getHoursMinutes($scope.tempPopup.sleep.offtime)
                $scope.tempPopup.sleep.offtimeObj.setHours(t.h)
                $scope.tempPopup.sleep.offtimeObj.setMinutes(t.m)
            }
            if ($scope.tempPopup.reboot && $scope.tempPopup.reboot.time) {
                $scope.tempPopup.reboot.time = new Date($scope.tempPopup.reboot.time)
            }


            $scope.displayModal = $modal.open({
                templateUrl: '/app/templates/display-set.html',
                scope: $scope
            });

        }

        $scope.displayModalCancel = function(){
            $scope.tempPopup = {};
            $scope.displayModal.close();
        }

        $scope.saveSettings = function () {

            $scope.group.selectedGroup = JSON.parse(JSON.stringify($scope.tempPopup));
            $scope.tempPopup = {};

            $scope.displayModal.close();
            var minutes,hours;
            if ($scope.tempPopup.sleep && $scope.tempPopup.sleep.ontimeObj) {
                hours = $scope.tempPopup.sleep.ontimeObj.getHours()
                $scope.group.selectedGroup.sleep.ontime = (hours < 10)?("0"+hours):(""+hours);
                minutes = $scope.tempPopup.sleep.ontimeObj.getMinutes();
                $scope.group.selectedGroup.sleep.ontime += (minutes < 10)?(":0"+minutes):":"+minutes;
            }
            if ($scope.tempPopup.sleep && $scope.tempPopup.sleep.offtimeObj) {
                hours = $scope.tempPopup.sleep.offtimeObj.getHours()
                $scope.group.selectedGroup.sleep.offtime = (hours < 10)?("0"+hours):(""+hours);
                minutes = $scope.tempPopup.sleep.offtimeObj.getMinutes();
                $scope.group.selectedGroup.offtime += (minutes < 10)?(":0"+minutes):":"+minutes;
            }

            switch ($scope.group.selectedGroup.imageSize) {
                case 1:
                    $scope.group.selectedGroup.imageLetterboxed = true;
                    $scope.group.selectedGroup.resizeAssets = true;
                    break;
                case 2:
                    $scope.group.selectedGroup.imageLetterboxed = false;
                    $scope.group.selectedGroup.resizeAssets = true;
                    break;
                default:
                    $scope.group.selectedGroup.resizeAssets = false;
            }
            switch ($scope.group.selectedGroup.videoSize) {
                // case 0:
                //     $scope.group.selectedGroup.videoKeepAspect = true;
                //     break;
                case 1:
                    $scope.group.selectedGroup.videoKeepAspect = true;
                    break;
                default:
                    $scope.group.selectedGroup.videoKeepAspect = false;
            }

            $scope.group.selectedGroup.enableMpv = $scope.group.selectedGroup.selectedVideoPlayer === "mpv"
            $scope.updateGroup();
        }

        $scope.groupTicker = function() {
            $scope.group.selectedGroup.ticker = $scope.group.selectedGroup.ticker || {}
            var ticker = $scope.group.selectedGroup.ticker
            ticker.enable = ticker.enable || false
            ticker.behavior = ticker.behavior || 'slide'
            ticker.textSpeed = ticker.textSpeed || 3
            ticker.rss = ticker.rss || { enable: false , link: null, feedDelay:10 }
            $scope.tickerObj = $scope.group.selectedGroup.ticker;
            $scope.tickerModal = $modal.open({
                templateUrl: '/app/templates/ticker-popup.html',
                scope: $scope
            });
        }
        $scope.saveTickerSettings = function() {
            if ($scope.group.selectedGroup.ticker.style)
                $scope.group.selectedGroup.ticker.style = $scope.group.selectedGroup.ticker.style.replace(/\"/g,'');
            if ($scope.group.selectedGroup.ticker.messages)
                $scope.group.selectedGroup.ticker.messages = $scope.group.selectedGroup.ticker.messages.replace(/'/g, "`")
            $scope.tickerModal.close();
            $scope.updateGroup();
            $scope.needToDeploy = true;
        }

        $scope.emergencyMessage = function() {
            $scope.emsgModal = $modal.open({
                templateUrl: '/app/templates/emergencyMessagePopup.html',
                scope: $scope
            })

        }
        $scope.messageSave = function() {
            $scope.emsgModal.close();
            $scope.updateGroup();
            $scope.needToDeploy = true;
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
            $scope.group.selectedGroup.resolution = $scope.group.selectedGroup.resolution || 'auto';
            $scope.group.selectedGroup.deploy = true;
            $scope.updateGroup(function (err,msg) {
                if (!err) {
                    piPopup.status({msg: 'Deployed! Request has been sent to all Players.', title: 'Deploy Success'});
                    $scope.needToDeploy = false;
                } else {
                    piPopup.status({msg: msg, title: 'Deploy Failed'});
                }
            })
        }
        $scope.closeWindow = function () {
            playerLoader.selectGroup();
        };

        $scope.showFileList = function() {
            $http.get(piUrls.files,{})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.assetFiles = data.data.files;
                        if (data.data.dbdata) {
                            $scope.filesDetails = {};
                            data.data.dbdata.forEach(function(dbdata){
                                if ($scope.assetFiles.indexOf(dbdata.name) >=0){
                                    $scope.filesDetails[dbdata.name] = dbdata;
                                }
                            })
                        }
                    }
                })
                .error(function(data, status) {
                });
            $scope.imgFilter = ".png"
            $scope.fileDisplayModal = $modal.open({
                templateUrl: '/app/templates/listFilePopup.html',
                scope: $scope,
                keyboard: false
            });
        }

        $scope.saveAssetFile = function(filename) {
            $scope.tempPopup.logo = filename;
            $scope.fileDisplayModal.close();
        }


    })

    .controller('ServerPlayerCtrl', function($scope,$http,$state,piUrls,$interval,$modal,TZNames,
                                             playerLoader,assetLoader,commands,piPopup) {
        
        playerLoader.reload();
        
        $scope.player = playerLoader.player;
        $scope.group = playerLoader.group;
        $scope.playlist = playerLoader.playlist;
        $scope.tzNames = TZNames;

        $scope.labelFilter = function(player){
            return (assetLoader.label.selectedPlayerLabel?
                    (player.labels && player.labels.indexOf(assetLoader.label.selectedPlayerLabel) >= 0):
                    true
            )
        }

        // $scope.assignGroup = function(player) {
        //     if (player.group.name) {
        //         player.group = $scope.group.groups[$scope.group.groupNames.indexOf(player.group.name)];
        //         $http.post(piUrls.players+player._id,{group:player.group})
        //             .success(function(data, status) {
        //                 if (data.success) {
        //                     player = data.data;
        //                 }
        //             })
        //             .error(function(data, status) {
        //             });
        //     }
        // }
        //
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

        $scope.saveName = function(player) {
            $http.post(piUrls.players+player._id,{name:player.name})
                .success(function(data, status) {
                    if (data.success) {
                        player = data.data;
                    }
                })
                .error(function(data, status) {
                });
        }


        $scope.snapshot = {
            image: "/app/img/snapshot.png",
            buttonTxt: "Take Snapshot"
        }

        $scope.shellCommand = function(player) {
            //if (player.statusClass == "text-danger")
            //    return console.log("Player is offline");
            
            $scope.msg = {player:player,cmd:'',err:"Type a shell command..."};
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/shell-popup.html',
                scope: $scope
            });
            $scope.getSnapshot()
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

        function getCssClass(groupId) {
            for (var i=0,len=$scope.group.groups.length;i<len;i++) {
                if ($scope.group.groups[i]._id == groupId) {
                    break;
                }
            }
            if (i < len) {
                return ($scope.group.groups[i].orientation)
            } else
                return "landscape"
        }

        $scope.getSnapshot = function() {
            $scope.snapshot.buttonTxt = "Please Wait";
            $http
                .post(piUrls.snapshot+$scope.msg.player._id)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.snapshot.image = (data.data.url) + "?" + Date.now()
                        $scope.snapshot.lastTaken = data.data.lastTaken
                        $scope.snapshot.buttonTxt = "Take Snapshot";
                        $scope.snapshot.cssClass = getCssClass(
                            ($scope.msg.player.group && $scope.msg.player.group._id)?$scope.msg.player.group._id:$scope.msg.player.selfGroupId);
                    } else {
                        $scope.snapshot.buttonTxt = data.stat_message;
                    }
                })
                .error(function(data, status) {

                });
        }

        $scope.changeTvState = function(flag){
            $scope.confirmmsg = "Your request has been sent, Please refesh page after 10 sec"
            $http
                .post(piUrls.pitv+$scope.msg.player._id, {status: flag})
                .success(function(data,status){
                    //console.log(data,status);
                    $scope.modal.dismiss()
                })
                .error(function(data,status){

                })
        }

        $scope.swUpdate = function(player) {
            if (player.statusClass == "text-danger")
                return console.log("Player is offline");
            $scope.msg = {player:player,curVer:player.version,
                newVer:player.player2?$scope.player.currentVersion.versionP2:$scope.player.currentVersion.version,};
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/swupdate-popup.html',
                scope: $scope
            });
        }

        $scope.confirmUpdate = function(version) {
            $http
                .post(piUrls.swupdate+$scope.msg.player._id, {version: version})
                .success(function(data, status) {
                    $scope.modal.close();
                })
                .error(function(data, status) {
                });
        }

        $scope.label = assetLoader.label
        $scope.loadCategory = function(){
            $scope.labelMode = "players"
            $scope.labelModal = $modal.open({
                templateUrl: '/app/partials/labels.html',
                controller: 'LabelsCtrl',
                scope: $scope
            })
            $scope.labelModal.result.finally(function(){
                playerLoader.getPlayers()
            })
        }
        $scope.clearCategory = function() {
            $scope.label.selectedPlayerLabel=null;
            playerLoader.getPlayers();
        }

        $scope.getOldEntry = function(event){ // handle every key-press event to check and  save commands
            if(event.keyCode == 38)
                $scope.msg.cmd = commands.previous();
            else if(event.keyCode == 40)
                $scope.msg.cmd = commands.next();
        }

        $scope.gotoPlaylist = function(plname) {
            var pl = assetLoader.playlist.playlists.find(function(item){
                return (item.name == plname)
            })
            assetLoader.selectPlaylist(pl)
            $state.go("home.assets.main");
        }

        $scope.loadPlayerDetails = function(player) {
            //$state.go("home.players.players_details",{player:player._id,group: player.group._id})
            if(!player._id)
                return;

            $scope.selectedPlayer = player;
            $scope.selectedGroup = $scope.selectedPlayer.group && $scope.selectedPlayer.group.name;

            $scope.selectedPlayer.labels = $scope.selectedPlayer.labels || []

            $scope.settingsModal = $modal.open({
                templateUrl: '/app/templates/groupChangePopUp.html',
                scope: $scope
            });

            $scope.playerLabels = assetLoader.label.labels.filter(function(label){
                return (label.mode && label.mode === "players")
            });
            $scope.playerLabels.forEach(function(label){
                if ($scope.selectedPlayer.labels.indexOf(label.name) >=0)
                    $scope.ngDropdown.selectedLabels.push(label)
            })

        }

        $scope.assignGroup = function(newGroupName) {
            var player = $scope.selectedPlayer;
            var newGroup = newGroupName || "__player__";
            $scope.selectedGroup = player.group && player.group.name;
            piPopup.confirm("--Do you want to Change the Group of the Player to "+newGroup, function() {
                var index =  $scope.group.groupNames.indexOf(newGroup);
                if (index == -1) {
                    player.group = {name: newGroup};
                } else {
                    player.group = $scope.group.groups[index];
                }
                // $scope.modal.close();
                $http.post(piUrls.players+player._id,{group:player.group})
                    .success(function(data, status) {
                        if (data.success) {
                            player = data.data;
                            $scope.selectedGroup = player.group.name
                            $scope.settingsModal.close()
                            $state.go($state.current,null,{reload: true, location:true});
                            //$location.path("/players/details/"+player._id).search({"group": player.group._id});
                        }
                    })
                    .error(function(data, status) {
                    });
            })
        }

        $scope.deregister = function() {
            piPopup.confirm("--Do you want to deregister the player", function() {
                $http
                    .delete(piUrls.players+$scope.selectedPlayer._id)
                    .success(function(data, status) {
                        if (data.success) {
                            playerLoader.reload();
                            $scope.settingsModal.close()
                        }
                    })
                    .error(function(data, status) {
                    });
            })
        }


        var saveLabels = function() {
            $http.post(piUrls.players+$scope.selectedPlayer._id,{labels:$scope.selectedPlayer.labels})
                .success(function(data, status) {
                    if (data.success) {
                    }
                })
                .error(function(data, status) {
                });
        }

        $scope.ngDropdown = {
            selectedLabels: [],
            extraSettings: {
                smartButtonMaxItems: 7,
                displayProp: 'name', idProp: 'name', externalIdProp: 'name',
                //scrollableHeight: '400px', scrollable: true,
                showCheckAll: false, showUncheckAll: false,
                enableSearch: true
            },
            customTexts: {buttonDefaultText: "Select Categories"},
            events: {
                onItemSelect: function (label) {
                    if (label)
                        $scope.selectedPlayer.labels.push(label.name)
                    saveLabels()
                },
                onItemDeselect: function (label) {
                    if (label)
                        $scope.selectedPlayer.labels.splice($scope.selectedPlayer.labels.indexOf(label.name),1)
                    saveLabels()
                }
            }
        }

        $scope.playerFetchTimer =$interval(playerLoader.getPlayers,60000);

        $scope.refresh = function(e) {
            playerLoader.getPlayers();
            e.currentTarget.blur();
        };

        $scope.$on("$destroy", function(){
            $interval.cancel($scope.playerFetchTimer)
        });
    })

/*
    .controller('PlayerDetailCtrl', function($scope,$http,$state,$stateParams,piUrls,$interval,$modal, playerLoader, piPopup) {

        playerLoader.reload();

        //$scope.player = playerLoader.player;
        $scope.group = playerLoader.group;

        $http.get(piUrls.players+ $stateParams.player,{})
            .success(function(data, status) {
                if (data.success) {
                    $scope.player = data.data;
                    $scope.selectedGroup = $scope.player.group.name
                }
            })
            .error(function(data, status) {
            });

        $scope.assignGroup = function() {
            var player = $scope.player
            var newGroup = $scope.selectedGroup || "__player__"
            $scope.selectedGroup = player.group.name;
            piPopup.confirm("--Do you want to Change the Group of the Player to "+newGroup, function() {
                var index =  $scope.group.groupNames.indexOf(newGroup)
                if (index == -1) {
                    player.group = {name: newGroup};
                } else {
                    player.group = $scope.group.groups[index];
                }
                $http.post(piUrls.players+player._id,{group:player.group})
                    .success(function(data, status) {
                        if (data.success) {
                            player = data.data;
                            $scope.selectedGroup = player.group.name
                            $state.go("home.players.players_details",{player:player._id,group: player.group._id})
                        }
                    })
                    .error(function(data, status) {
                    });
            })
        }

        var saveLabels = function() {
            $http.post(piUrls.players+$scope.player._id,{labels:$scope.player.labels})
                .success(function(data, status) {
                    if (data.success) {
                    }
                })
                .error(function(data, status) {
                });
        }




    })
*/





