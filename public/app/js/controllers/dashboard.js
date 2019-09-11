'use strict';

angular.module('dashboard.controllers', [])
    .controller('DashboardCtrl', function ($scope,$http,$interval,piUrls,selectedLabel) {

        var BUCKET_INTERVALS = [5,60,240,24 * 60, 7 * 24 * 60];

        $scope.COUNT_FIELDS = [
            {field:"locationName",name:"Location wise"},
            {field:"groupName",name:"Group wise"},
            {field:"currentPlaylist",name:"Playlists playing"},
            {field:"version",name:"Software version"}
            ]

        $scope.playersStatFieldWise = {}

        $scope.BUCKET_TITLE = ["now","Last 60 minutes","Last 4 hours","Today","Last 7 days","> 7 days"]
        $scope.BUCKET_CLASS = ["success","primary","info","warning","light-danger","danger"]

        var getPlayers = function() {
            var options = {params: {}},
                lastReportedTimeInMinutes;
            $scope.selLabel = selectedLabel;
            selectedLabel.selectedLabel = null;

            $http.get(piUrls.players, options)
                .then(function(response) {
                    var data = response.data;
                    if (data.success) {
                        $scope.players = data.data.objects;
                        $scope.currentVersion = data.data.currentVersion;

                        Object.keys(selectedLabel.labelsCount).forEach(function(item){
                            selectedLabel.labelsCount[item]= 0;
                        });

                        $scope.COUNT_FIELDS.forEach(function(obj){
                            $scope.playersStatFieldWise[obj.field] = {}
                        })
                        $scope.playersStat = [0,0,0,0,0,0]
                        $scope.playersExpectedToReport = []

                        $scope.players.forEach(function(player){
                            var l, lIndex;

                            player.lastReported = player.lastReported || 0;    //never reported
                            player.groupName = player.group && player.group.name
                            player.locationName = player.configLocation || player.location

                            $scope.COUNT_FIELDS.forEach(function(obj){
                                l = player[obj.field] || "NA";
                                if (l && l.trim()) {
                                    l = l.trim()
                                    if (!$scope.playersStatFieldWise[obj.field][l])
                                        $scope.playersStatFieldWise[obj.field][l] = {name: l, count: 1}
                                    else
                                        $scope.playersStatFieldWise[obj.field][l].count += 1;
                                }
                            })

                            player.labels.forEach(function(item){
                                selectedLabel.labelsCount[item]=(selectedLabel.labelsCount[item] || 0)+1;
                            })
                            lastReportedTimeInMinutes = parseInt((Date.now() - (new Date(player.lastReported).getTime()))/60000);
                            for (var i=0,len=BUCKET_INTERVALS.length;i<len;i++) {
                                if (lastReportedTimeInMinutes <= BUCKET_INTERVALS[i]) {
                                    $scope.playersStat[i] += 1;
                                    break;
                                }
                            }
                            if (i == len)
                                $scope.playersStat[i] += 1;
                            if (lastReportedTimeInMinutes > 6 && lastReportedTimeInMinutes < 60)
                                $scope.playersExpectedToReport.push({name:player.name,lastReported:player.lastReported})

                        });
                        $scope.COUNT_FIELDS.forEach(function(obj){
                            $scope.playersStatFieldWise[obj.field+"Count"] = []
                            for(var objectKey in $scope.playersStatFieldWise[obj.field]) {
                                $scope.playersStatFieldWise[obj.field+"Count"].push($scope.playersStatFieldWise[obj.field][objectKey]);
                            }

                            $scope.playersStatFieldWise[obj.field+"Count"].sort(function(a, b){
                                return parseInt(b.count) - parseInt(a.count);
                            });
                        })
                    }
                        $scope.COUNT_FIELDS_TO_SHOW = $scope.COUNT_FIELDS;

                },function (response) {
                });
        }
        getPlayers()
        $scope.playerFetchTimer =$interval(getPlayers,60000);

        getPlayers();

        $scope.$on("$destroy", function(){
            $interval.cancel($scope.playerFetchTimer)
        });
    })
