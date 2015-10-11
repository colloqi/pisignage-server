'use strict';
angular.module('piIndex.controllers', [])

    .controller('IndexCtrl', function ($scope, $rootScope, $location, $http, $state) {

        $scope.getClass = function (state) {
            if ($state.current.name.indexOf(state) == 0) {
                return "active"
            } else {
                return ""
            }
        }
    });