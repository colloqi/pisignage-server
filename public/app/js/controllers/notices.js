'use strict;'

angular.module('pinotice.controllers', [])


.controller('CalendarCtrl',['$scope','$http','piUrls', '$location', '$rootScope', '$stateParams',
    'Navbar',
    function($scope, $http, piUrls, $location, $rootScope, $stateParams, Navbar){

        Navbar.showPrimaryButton= false;
        $scope.calendarname = $stateParams.file;

        if($stateParams.file != "new"){
            $http
                .get(piUrls.calendars+$stateParams.file)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.calendar = data.data;
                    }
                })
                .error(function(data, status) {
                });
        }
        $scope.selectedCalendar = function(value) {
            $http
                .post(piUrls.calendars+$stateParams.file, {email: value})
                .success(function(data, status) {
                    if (data.success) {
                        console.log(data);
                    }
                })
                .error(function(data, status) {
                });
        }

    }])

.controller('LinksCtrl', ['$scope','$http','piUrls', '$stateParams',
        function($scope, $http, piUrls, $stateParams){
        $http
            .get(piUrls.links+$stateParams.file)
            .success(function(data,status){
                if(data.success){
                    $scope.urlLink = JSON.parse(data.data);
                }
            })
            .error(function(data,status){
                console.log(data,status);
            })
}])
