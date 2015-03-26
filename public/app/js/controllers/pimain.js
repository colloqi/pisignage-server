'use strict;'

angular.module('pisignage.controllers', [])
    .factory('Navbar', function() {
        return({showPrimaryButton:false,primaryButtonText:null, primaryButtonTypeClass:false, primaryButtonHandler:null})
    })
    .controller('NavbarCtrl', ['$scope','$rootScope', '$location','$window','cordovaReady' ,'screenlog','$state','Navbar',
        function($scope,$rootScope, $location,$window,cordovaReady,screenlog, $state,Navbar) {

            $scope.navbar = Navbar;

            cordovaReady.then(function() {
                screenlog.debug("Cordova Service is Ready");
            });
            
            $scope.goBack = function() {
                $window.history.back();
            };
            $scope.goHome = function() {
                $location.path('/');
            };
            $scope.doSearch = function() {
                $scope.showSearchField=!$scope.showSearchField;
                if (!$scope.showSearchField)
                    $scope.search = null;
            };
            

            $rootScope.$on('$stateChangeStart', function (event, toState,toParams) {

                $scope.navbar.showPrimaryButton = false;
                $scope.showSearchButton = false;
                $scope.showBackButton = toState.showBackButton;

            });

            $scope.$on('onlineStatusChange',function(event,status){
                $scope.onlineStatus = status?"green":"red";
            })            

            $scope.primaryButtonClick = function() {
                $scope.navbar.primaryButtonHandler($scope.navbar.primaryButtonText);
            }
    }]).
    controller('HomeCtrl', ['$scope','$http','piUrls',function($scope,$http,piUrls) {
        $scope.operationInProgress= false;
        function getStatus () {
            $http.get(piUrls.getStatus,{}).success(function(data,status){

                $scope.diskSpaceUsed = data.data.diskSpaceUsed;
                $scope.diskSpaceAvailable = data.data.diskSpaceAvailable;
                $scope.playlistOn = data.data.playlistOn;
                $scope.duration = data.data.duration + (new Date().getTimezoneOffset() * 60000);
                $scope.tvStatus = data.data.tvStatus;
                $scope.currentPlaylist = data.data.currentPlaylist;

            })
        }

        getStatus();
        $scope.interval= setInterval(function(){
            getStatus();
        }, 10000);

        $scope.play = function() {
            $scope.operationInProgress= true;
            $http
                .post(piUrls.play+'default', { play: true})
                .success(function(data,success){
                    getStatus();
                    $scope.operationInProgress= false;
                })
        }
        $scope.stop = function() {
            $scope.operationInProgress= true;
            $http
                .post(piUrls.play+'default', { stop: true})
                .success(function(data,success){
                    getStatus();
                    $scope.operationInProgress= false;
                })
        }

    }]).
    controller('ReportsCtrl',['$scope',function($scope){

    }]).
    controller('SettingsCtrl',['$scope','$rootScope','$location','Navbar','piUrls','$http','$modal','$stateParams','$state',
        function($scope,$rootScope,$location, Navbar,piUrls,$http,$modal,$stateParams,$state){

            Navbar.showPrimaryButton= true;
            Navbar.primaryButtonText= "DONE";
            Navbar.primaryButtonTypeClass= "btn-success";
            $scope.settings = {
                localName: "piSignage",
                note: "you can leave a note here"
            }

            $http.get(piUrls.settings,{})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.settings = data.data;                        
                        $scope.settings.ipsettings.netmask=$scope.settings.ipsettings.netmask || "255.255.255.0";
                    }
                })
                .error(function(data, status) {
                });

            $scope.save = function() {
                $scope.settings.nameChanged = true;
                $http
                    .post(piUrls.settings, $scope.settings )
                    .success(function(data, status) {
                        if (data.success) {
                            //console.log(data.stat_message);
                            $scope.settings = data.data;
                            $scope.settings_name.$setPristine();
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }

            $scope.pbHandler = function(buttonText){
                if (buttonText == "DONE") {
                    //$scope.save();
                    $location.path('/');
                }
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;
            
            $scope.swUpdate = function() {
                $scope.msg = {curVer:$scope.settings.version,newVer:$scope.settings.currentVersion.version};
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/swUpdatePopup.html',
                    scope: $scope
                });
            }
            
            $scope.confirmUpdate = function() {
                $http
                    .post(piUrls.piswupdate, {})
                    .success(function(data, status) {
                        $scope.modal.close();
                    })
                    .error(function(data, status) {
                    });
            }
            
            $scope.saveIP= function(){                
                $scope.settings.ipsettings.changed= true;
                $http
                    .post(piUrls.settings, $scope.settings )
                    .success(function(data, status) {
                        if (data.success) {
                            console.log(data.stat_message);
                            $state.transitionTo($state.current, $stateParams,
                                { reload: true, inherit: false, notify: true });
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }
            
            $scope.saveWifi = function() {
                $scope.settings.wifi.changed = true;
                $http
                    .post(piUrls.settings, $scope.settings)
                    .success(function(data, status) {
                        if (data.success) {
                            $state.transitionTo($state.current, $stateParams, { reload: true });
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }
			
            $scope.overscanbtn = true;
            $scope.resize = function(e){
                $scope.settings.overscan.changed = true;
                $scope.settings.overscan.horizontal = parseInt($scope.settings.overscan.horizontal,10);
                $scope.settings.overscan.vertical = parseInt($scope.settings.overscan.vertical,10);
                $scope.overscanbtn = false;

                $http
					.post(piUrls.settings,$scope.settings)
					.success(function(data,status){
						if(data.success){
							$scope.settings.overscan = data.data;
						}
					})
					.error(function(data,status){
						console.log(status);
					});
            }

            $scope.orientation = function(){
                $http
                    .post(piUrls.settings,$scope.settings)
                    .success(function(data,status){
                        if(data.success){
                            $scope.settings.orientation = data.data.orientation;
                            $scope.settings.resolution = data.data.resolution;
                        }else{
                            $scope.errorMsg = data.stat_message;
                        }
                        
                    })
                    .error(function(data,status){
                        console.log(data,status);
                    })
            }
    }])
