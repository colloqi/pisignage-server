'use strict';
angular.module('piIndex.controllers', [])

.factory('Upload', function() {
    return({functions: null})
})

.controller('IndexCtrl', function($scope,$rootScope, $location, $http, $state,Upload) {

        $scope.upload = Upload;

        $scope.getClass = function(state) {
            if ($state.current.name.indexOf(state) == 0) {
                return "active"
            } else {
                return ""
            }
        }
});