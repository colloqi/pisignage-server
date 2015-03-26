'use strict';

angular.module('piUser.controllers',[])

    .controller('LoginCtrl', ['$scope', 'Auth', '$location', '$window','piUrls',
        function ($scope, Auth, $location,$window,piUrls) {

            $scope.user = {};
            $scope.errors = {};

            $scope.forgoturl = function() {
                $window.open(piUrls.forgot, '_system','location=yes');
            }

            $scope.login = function(form) {
                $scope.submitted = true;

                if(form.$valid) {
                    Auth.login({
                        email: $scope.user.email,
                        password: $scope.user.password
                    })
                    .then( function() {
                        // Logged in, redirect to home
                        //$location.path('/');
                        $window.location.href = '/';
                    })
                    .catch( function(err) {
                        err = err.data;
                        $scope.errors.other = err.message;
                    });
                }
            };
    }])

    .controller('SignupCtrl', function ($scope, Auth, $location,$http,$window) {
        $scope.user = {role:'User'};
        $scope.errors = {};
        $scope.roles = ['Admin','Author','Support','User'];
        $scope.unameAvailable = false;
        $scope.unameValid= true;

        $scope.$watch('user.username', function(newVal, oldVal) {
            if(newVal && (newVal !== oldVal)) {
                if($scope.user.username.match(/^[\w]+$/) == null){
                    $scope.unameValid= false;
                    return;
                }else{
                    $scope.unameValid= true;
                }
                $http.get('/api/usernames/' + $scope.user.username, {})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.unameAvailable = data.data.available;
                        }
                    });
            }
        });

        $scope.register = function(form) {

            if(form.$valid) {
                Auth.createUser($scope.user)
                .then( function() {
                    // Account created, redirect to home
                    //$location.path('/');
                    $window.location.href = '/';
                    })
                .catch( function(err) {
                    err = err.data;
                    $scope.serverErrors = '';

                    // Update validity of form fields that match the mongoose errors
                    angular.forEach(err.errors, function(error, field) {
                        //form[field].$setValidity('mongoose', false);
                        $scope.serverErrors += field + ':' +error.type + String.fromCharCode(13);
                    });
                });
            }
        };

        $scope.checkPassword = function() {
            $scope.signinForm.retype_password.$error.dontmatch
                = $scope.user.password !== $scope.user.retype_password;
        };
    }).

    controller('SettingsCtrl', function ($scope, User, Auth) {
        $scope.errors = {};

        $scope.changePassword = function(form) {
            $scope.submitted = true;

            if(form.$valid) {
                Auth.changePassword( $scope.user.oldPassword, $scope.user.newPassword )
                    .then( function() {
                        $scope.message = 'Password successfully changed.';
                    })
                    .catch( function() {
                        form.password.$setValidity('mongoose', false);
                        $scope.errors.other = 'Incorrect password';
                    });
            }
        };
    });
