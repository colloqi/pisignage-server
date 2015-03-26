'use strict';
angular.module('piIndex.controllers', [])

.factory('Navbar', function() {
    return({showPrimaryButton:false,primaryButtonText:null, primaryButtonTypeClass:false, primaryButtonHandler:null})
})

.controller('IndexCtrl', function($scope,$rootScope, $location, $http, $state, Auth,Navbar,$window,$modal,piUrls) {

        $scope.navbar = Navbar;

        $rootScope.$on('$stateChangeStart', function (event, toState,toParams) {

            $scope.navbar.showPrimaryButton = false;
            $scope.showSearchButton = false;
            $scope.showBackButton = toState.showBackButton;

        });

        $scope.primaryButtonClick = function() {
            $scope.navbar.primaryButtonHandler($scope.navbar.primaryButtonText);
        }

        $scope.getClass = function(state) {
            if ($state.current.name == state) {
                return "active"
            } else {
                return ""
            }
        }

        $scope.loadState = function(state) {
            $state.go(state);
        }

        $scope.logout = function () {
            Auth.logout()
                .then(function () {
                    $window.location.href = '/';
                });
        };
        
        $scope.changePassword = function() {
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/changePassword.html',
                scope: $scope
            });            
        }

        $scope.submit = function() {
            if($scope.password.new === $scope.password.confirm) {                
                $http.put(piUrls.users, {oldPassword: $scope.password.old, newPassword: $scope.password.new})
                    .success(function(data, status) {
                        $scope.message= data.stat_message;
                        if (data.success) {                            
                            $scope.modal.close();                            
                        }else{                            
                            $scope.password= {};
                        }
                    })
                    .error(function(data, status) {
                        $scope.modal.close();
                    });
            }else{
                $scope.message = 'Passwords do not match!!';
            }
        }

});