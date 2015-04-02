'use strict';
angular.module('piIndex.controllers', [])

.factory('Navbar', function() {
    return({showPrimaryButton:false,primaryButtonText:null, primaryButtonTypeClass:false, primaryButtonHandler:null})
})

.controller('IndexCtrl', function($scope,$rootScope, $location, $http, $state,Navbar) {

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
});