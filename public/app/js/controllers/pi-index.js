'use strict';
angular.module('piIndex.controllers', [])

    .controller('IndexCtrl', function ($scope, $rootScope, $location, $http, $state, castApi) {

        $scope.getClass = function (state) {
            if ($state.current.name.indexOf(state) == 0) {
                return "active"
            } else {
                return ""
            }
        }

        $scope.castStatus = castApi.castStatus;

        $scope.launchCastApp = function() {
            if ($scope.castStatus.deviceState == "0")
                castApi.launchApp()
            else
                castApi.stopApp()
        }

    });