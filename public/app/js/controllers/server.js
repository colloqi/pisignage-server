'use strict;'

angular.module('server.controllers', [])
    .filter('duration',function(){
        return function(mins) {
            var days = Math.floor(mins/1440),
                hours = Math.floor(mins /60) % 24,
                minutes = mins % 60;
            return days+"d "+hours+"h "+minutes+"m";
        }
    })
    .controller('ServerPlayerCtrl', ['$scope','$http','piUrls','orderByFilter','$filter','$stateParams', '$interval','$modal',
        function($scope,$http,piUrls,orderByFilter,$filter,$stateParams,$interval,$modal) {

            var getPlayers = function() {
                var options;
                if ($stateParams.group)
                    options = {params: {group: $stateParams.group}}
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

            getPlayers();

            $http
                .get(piUrls.groups, {})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.groupObj = data.data;
                        $scope.groups= $scope.groupObj.map(function(group){
                            return (group.name)
                        });
                    }
                })
                .error(function(data, status) {
                });

            $scope.register = function() {
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/registerPlayerPopup.html',
                    scope: $scope
                });
                $scope.newPlayer = {group:$scope.groupObj[0]};
            }
            
            $scope.humanize = function() {
                var str, str1='';
                var data = $scope.newPlayer.cpuSerialNumber;
                if(data) {                        
                    str = data.replace(/[^0-9a-f]/gi,'').toLowerCase().slice(0,16);
                    while(str.length > 4) {
                        str1 += str.slice(0,4)+'-';
                        str = str.slice(4);
                    }
                    str1 += str;
                    $scope.newPlayer.cpuSerialNumber= str1;
                }
            }

            $scope.submit = function() {                
                $scope.newPlayer.cpuSerialNumber = ($scope.newPlayer.cpuSerialNumber.replace(/[^0-9a-f]/gi,'')).toLowerCase();
                $http.post(piUrls.players, $scope.newPlayer)
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.modal.close();
                            getPlayers();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                        $scope.modal.close();
                    });
            }


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
                    templateUrl: '/app/templates/shellPopup.html',
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
                    templateUrl: '/app/templates/swUpdatePopup.html',
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




        }])

    .controller('ServerSettingsCtrl', function($scope,$http,$modal,piUrls,piPopup) {
        $http
            .get(piUrls.collaborators, {})
            .success(function(data, status) {
                if (data.success) {
                    $scope.collaborators = data.data;
                }
            })
            .error(function(data, status) {
            });

        //typeahead fetch functions
        $scope.getUsers = function(userid) {
            return $http.get(piUrls.usernames,{params:{ str: userid}}).
                then(function(response){
                    $scope.defaultCollaborator = response.data.data?response.data.data[0]:null;
                    return response.data.data;
                });
        };

        $scope.add = function() {
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/collaboratorPopup.html',
                scope: $scope
            });
            $scope.new = {}
        }

        $scope.submit = function() {
            if (!$scope.new.collaborator._id) {
                if ($scope.new.collaborator == $scope.defaultCollaborator.username)
                    $scope.new.collaborator = $scope.defaultCollaborator
                else
                    return;
            }
            $http.post(piUrls.collaborators, $scope.new)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.modal.close();
                        $scope.collaborators.push($scope.new.collaborator);
                    }
                })
                .error(function(data, status) {
                    console.log(status);
                    $scope.modal.close();
                });
        }

        $scope.delete = function(index) {
            $http
                .delete(piUrls.collaborators+$scope.collaborators[index]._id)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.collaborators.splice(index,1);
                    }
                })
                .error(function(data, status) {
                });
        }
        
        $scope.saveDownloadAuth= function(){
            $http.post(piUrls.downloadauth, $scope.downloadAuth)
                .success(function(data, status) {
                    if (data.success) {                       
                    }
                })
                .error(function(data, status) {
                });
        }
       
        $http
            .get(piUrls.downloadauth, {})
            .success(function(data, status) {
                if (data.success) {                    
                    $scope.downloadAuth= data.data;
                }
            })
            .error(function(data, status) {
            });
        
        $http.get(piUrls.players)
            .success(function (data, status) {
                if (data.success) {
                    $scope.players= data.data.objects;                                      
                }
            })
            .error(function (data, status) {
            });
        
        $scope.deregister = function(index) {
            piPopup.confirm("Player", function() {
                $http
                    .delete(piUrls.players+$scope.players[index]._id)
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.players.splice(index,1);
                        }
                    })
                    .error(function(data, status) {
                    });
            })
        }
    })

    .controller('ServerReportsCtrl', function($scope, $http, piUrls,$modal,$filter) {
        $scope.types = ['Stats', 'Events'];   //Files is removed temporarily
        $scope.ranges = [
            { name: 'Today', value: 0  } ,
            { name: 'Since Yesterday', value: 1 },
            { name: 'Last 7 Days', value: 7 },
            { name: 'Last 30 Days', value: 30 },
            { name: 'Last 1 Year', value: 365 }
        ];
        $scope.range = $scope.ranges[0];
        $scope.type = $scope.types[0];
        $scope.nav = false;
        
        $scope.showRep = function() {
            $scope.month = null;        //for monthly report fix!!
            $scope.mode="graphs";
            $scope.dataLoading = true;
            $scope.graphData = [];
            var plotData = {};
            var seriesFields = [],
                series = [];                

            var params = {
                player: $scope.player?$scope.player._id:null,
                range: $scope.range.value,
                type: $scope.type.toLowerCase(),
                tilldate: Date.now()
            }

            $http.get(piUrls.getStats, {params: params} )
                .success(function(data, status) {
                    $scope.dataLoading = false;
                    if (data.success) {
                        $scope.serverData = data.data;
                        if ($scope.type != 'Stats') {
                            data.data.forEach(function(obj) {
                                for(var y in obj.value) {
                                    plotData[y] = [];
                                }
                            })
                        } else {
                            plotData = {
                                'server-connected':[],
                                'playerUptime': []
                            }
                        }
                        data.data.forEach(function(obj) {
                            for(var y in plotData) {
                                plotData[y].push([obj._id, obj.value[y]?Math.round(obj.value[y]): 0]);
                            }
                        })
                        for(var y in plotData) {
                            if (y == "playerUptime")
                                $scope.graphData.push({key: y,bar:true, values: plotData[y]})
                            else
                                $scope.graphData.push({key: y, values: plotData[y]})
                        }
                    } else {
                        console.log('Failed: '+data);
                    }
            })
                .error(function(data, status) {
                    $scope.dataLoading = false;
                    console.log('error',data);
            });            

            $scope.xAxisTickFormat = function(){
                return function(d) {
                    var date = new Date(d),
                        h = date.getHours();
                    if(h % 6 == 0) {
                        return d3.time.format("%d%b %Hh")(date);
                    } else {
                        return d3.time.format("%H")(date);
                    }
                }
            }

            $scope.yAxisTickFormat = function () {
                return function (d) {
                    return  d3.format('.0f')(d);
                };
            }

            $scope.toolTip = function(){
                return function(key, x, y, e, graph) {
                    var label = key,
                        item = 'Players';
                    var uscore = function(val) {
                        return val.split('_').join(' ');
                    }
                    if(key.match(/\.[a-z]+/i)) { //files
                        if(label.indexOf('_') != -1) {
                            label = uscore(key);
                            item = 'times';
                        }
                    } else if(key.indexOf('_') != -1) { //events
                        label = uscore(key);
                        item = 'times';
                    } else if(key.match(/([A-Z])/g)){
                        label = key.replace(/([A-Z])/g, ' $1');
                        if(key.indexOf('tvUptime') != -1) {
                            item = 'TVs';
                        }
                    }
                    return  '<h3 style="text-transform:capitalize">' + label + '</h3>' +
                        '<p>' +  parseInt(y).toFixed() +' '+item + '  at ' + x.replace(/h?$/,'h') + '</p>'
                }
            }
        }


        $http.get(piUrls.players)
            .success(function (data, status) {
                if (data.success) {
                    $scope.players= data.data.objects;
                }
            })
            .error(function (data, status) {
            });

        var processStats = function(statDetails,cb,plneeded) {
            var playerWiseData = {},
                allPlayers = {};
            statDetails.forEach(function(daily){
                daily.onTime = 0;
                for (var key in daily.hourly) {
                    daily.onTime += daily.hourly[key]['playerUptime'];
                }
                daily.onTime = daily.onTime.toFixed(2);
                var hrs = parseInt(daily.onTime);
                var min = Math.round((daily.onTime - hrs) * 60);
                daily.onTime = hrs+':'+min;
                if (daily.playerId) {
                    playerWiseData[daily.date] = playerWiseData[daily.date] || {}
                    playerWiseData[daily.date][daily.playerId._id] = daily;
                    allPlayers[daily.playerId._id] = daily.playerId.name;
                } else
                    console.log(daily);
            })
            var index = 0,
                len = statDetails.length;
            var getConnects = function() {
                if (index >= len) {
                    return cb(null,playerWiseData);
                }
                var item = statDetails[index];
                var params = {
                    player: item.playerId._id,
                    starttime: item.date
                }
                $http.get(piUrls.getConnectStats, {params:params} )
                    .success(function(data, status) {
                        if (data.success) {
                            item.playlists = [];
                            data.data.playlists.forEach(function(pl){
                                var x= pl.description.slice(pl.description.indexOf('to ')+3)
                                if (item.playlists.indexOf(x) == -1)
                                    item.playlists.push(x);
                            });
                            if (item.playlists.length <= 1)
                                item.playlists = item.playlists[0];
                            /*
                            for (var i= 0,num = data.data.connects.length;i<num;i++) {
                                if (data.data.connects[i].description=='connect') {
                                    item.connected = "yes"
                                    break;
                                }
                            }*/
                        } else {
                            console.log('Failed: '+data);
                        }
                        index++;
                        getConnects();
                    })
                    .error(function(data, status) {
                        console.log('error',data);
                        index++;
                        getConnects();
                    });
            }
            if (plneeded)
                getConnects();
            else
                return cb(null,playerWiseData,allPlayers);
        }


        $scope.showDetails = function(item,index) {
            if ($scope.detailsWait)
                return;
            $scope.detailsWait = true;
            var params = {
                player: $scope.player?$scope.player._id:null,
                starttime: item.values[index][0],
                type: $scope.type.toLowerCase(),
                field: item.key,
                tilldate: item.values[index+1]?item.values[index+1][0]:(item.values[index][0]+
                                                    item.values[index][0]-item.values[index-1][0])
            }
            $scope.itemKey = item.key;
            $scope.itemTs = item.values[index][0];


            $http.get(piUrls.getStatsDetails, {params: params} )
                .success(function(data, status) {
                    $scope.detailsWait = false;
                    if (data.success) {
                        $scope.statDetails = data.data;
                        $scope.modal = $modal.open({
                            templateUrl: '/app/templates/reportDetailsPopup.html',
                            scope: $scope,
                            size: 'lg'
                        });
                        if ($scope.type == "Stats") {
                            processStats($scope.statDetails,function(err,stats){
                                if (err)
                                    console.log("error occured: "+err+stats);
                            }, true)
                        }
                    } else {
                        console.log('Failed: '+data);
                    }
                })
                .error(function(data, status) {
                    $scope.detailsWait = false;
                    console.log('error',data);
                });
        }

        //monthly report related code
        var startingDate = new Date(2014,9,1),
            tillDate = new Date();

        $scope.months = [];
        for (var d = startingDate;d < tillDate;) {
            $scope.months.push(d.getTime());
            d.setMonth(d.getMonth() +1);
        }

        $scope.getMonthlyReport = function() {
            $scope.mode="monthly";

            var day = $scope.month,
                nm = new Date($scope.month),
                endDate;
            nm.setMonth(nm.getMonth()+1)
            endDate = nm.getTime() - 1000;

            var params = {
                type: 'stats',
                starttime: day,
                tilldate: endDate
            };
            $http.get(piUrls.getStatsDetails, {params: params})
                .success(function (data, status) {
                    if (data.success) {
                        processStats(data.data, function (err, data, allPlayers) {
                            if (!err) {
                                $scope.monthlyReport = data;
                                $scope.allPlayers = allPlayers;
                                $scope.reportReady = true;
                            }
                        })
                    } else {
                        console.log('Failed: ' + data);
                    }
                })
                .error(function (data, status) {
                    console.log('error', data);
                });
        }

        $scope.getCsvReport = function() {
            $scope.reportFile = $filter('date')($scope.month, 'MMMyyyy');

            var reportArray = [],
                row = [],
                days = Object.keys($scope.monthlyReport);

            days.sort(function(a, b){return a - b;});

            //header row
            row =["Player"];
            for (var i= 0,len=days.length;i<len;i++) {
                row.push($filter('date')(days[i], 'dd'))
            }
            reportArray.push(row);
            for (var r in $scope.allPlayers) {
                row = [$scope.allPlayers[r]]
                for (var i= 0,len=days.length;i<len;i++) {
                    if ($scope.monthlyReport[days[i]][r])
                        row.push($scope.monthlyReport[days[i]][r]['onTime'])
                    else
                        row.push(' ');
                }
                reportArray.push(row);
            }
            return reportArray;
        }

        $scope.showRep();               
    })