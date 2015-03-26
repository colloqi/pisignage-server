'use strict';

/* Common Controllers */

angular.module('piBasic.controllers', ['ui.bootstrap','ngRoute'])


controller('SigninCtrl', ['$scope',function($scope) {
    try {
        $scope.user = user;
    }
    catch(e) {

    }
    $scope.isNumber = function(value) {
        return !value || !isNaN(value);
    }
    $scope.isUsernameOK = function(value) {
        var re = /\S+@\S+\.\S+/;
        return (re.test(value) || !isNaN(value));
    }
}]).

controller('ResetCtrl', ['$scope',function($scope) {
    $scope.checkResetPassword = function() {
        $scope.resetForm.retype_password.$error.dontmatch
            = $scope.user.password !== $scope.user.retype_password;
    };
}]);
