'use strict;'

angular.module('piSettings.controllers', []).
    controller('SettingsCtrl', function ($scope, $http, piUrls, $state, $modal,$window) {

        //licenses part

        $scope.savedFiles = []; // license files
        $scope.statusMsg = null;

        $http.get(piUrls.licenses)
            .success(function (data) {
                if (data.success)
                    $scope.savedFiles = data.data;
                else
                    $scope.statusMsg = data.stat_message;

            }).error(function (err) {
                console.log(err);
            })
        $scope.upload = {
            onstart: function (files) {
                console.log('start upload');
            },
            ondone: function (files, data) {
                $scope.statusMsg = "Upload Complete";
                $state.reload();
            },
            onerror: function (files, type, msg) {
                $scope.statusMsg = 'Upload Error,' + type + ': ' + msg;
                ;
                ;
            }
        };
        $scope.deleteEntry = function (filename) { // delete license
            $scope.deleteText = ' license file ' + filename;
            $scope.modal = $modal.open({
                animation: true,
                scope: $scope,
                templateUrl: '/app/templates/confirm-popup.html'
            })
            $scope.ok = function () {
                $http.delete(piUrls.licenses + filename)
                    .success(function (data) {
                        if (data.success) {
                            $scope.modal.dismiss(); // close modal if successful
                            $scope.savedFiles = data.data;
                        } else {
                            $scope.statusMsg = data.stat_message;
                        }

                    }).error(function (err) {
                    })
            }
            $scope.cancel = function () {
                $scope.modal.dismiss();
            }
        }

        //settings part
        $http.get(piUrls.settings)
            .success(function (data) {
                if (data.success)
                    $scope.settings = data.data;

            }).error(function (err) {
                console.log(err);
            })

        $scope.saveSettings= function(){
            $http.post(piUrls.settings, $scope.settings)
                .success(function(data, status) {
                    if (data.success) {
                    }
                    if ($scope.settingsForm.user.$dirty) {
                        $scope.settingsForm.$setPristine();
                        $scope.loadMsg = "reloading..."
                        setTimeout($window.location.reload.bind($window.location), 2000);
                    }
                })
                .error(function(data, status) {
                });
        }

    });