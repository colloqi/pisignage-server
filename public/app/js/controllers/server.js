'use strict;'

angular.module('server.controllers', [])
    .controller('ServerPlayerCtrl',
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




        })

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

