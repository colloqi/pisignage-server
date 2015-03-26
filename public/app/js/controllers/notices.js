'use strict;'

angular.module('pinotice.controllers', [])
    .controller('NoticeCtrl',['$scope','$http','piUrls', '$location', '$rootScope', '$stateParams',
        'Navbar', '$sce',
        function($scope, $http, piUrls, $location, $rootScope, $stateParams, Navbar,$sce){

        Navbar.showPrimaryButton= false;
        $scope.noticename = $stateParams.file;

        $scope.noticePreview = false;

        if($stateParams.file != "new"){
            $http
            .get(piUrls.notices+$stateParams.file)
            .success(function(data, status) {
                var notice = data.data;
                if (data.success) {
                    $scope.notice= {
                        title: notice.title,
                        description: notice.description,
                        footer: notice.footer
                    }
                    $scope.previewimagepath= (notice.image)? decodeURIComponent("/media/"+notice.image) : null;
                }
            })
            .error(function(data, status) {
            });
        } else {
            $scope.notice= {
                title: "",
                description: "",
                footer: "",
                image: null
            }
        }

        $scope.noticedone= function(files, data){
            if($scope.previewimagepath){
                $http
                .delete(piUrls.notices+$scope.previewimagepath.split('/')[2])
                .success(function(data, status) {
                    if (data.success) {
                        console.log(data.stat_message);
                    }
                })
                .error(function(data, status) {
                });
            }
            $scope.errmsg= null;
            $scope.previewimagepath= "/media/"+encodeURIComponent(data.data[0].name);
        }

        $scope.saveNotice= function(){
            var filename= ($stateParams.file != 'new')? $stateParams.file: '';
            var formdata= {
                title: $scope.notice.title,
                description: $scope.notice.description,
                imagepath: encodeURIComponent($scope.previewimagepath) || '',
                image: ($scope.previewimagepath)? $scope.previewimagepath.split('/')[2] : '',
                footer: $scope.notice.footer
            };
           $http
           .post(piUrls.notices+filename, { formdata: formdata } )
           .success(function(data, status) {
                if (data.success){
                    $scope.noticePreview = true;
                    var i=data.data.indexOf("img src=");
                    var str = data.data.slice(0,i+9)+"/media/"+data.data.slice(i+9);
                    $scope.serverPreview = $sce.trustAsHtml(str);
                }
            })
           .error(function(data, status) {
            });
        }

        $scope.err= function(file, msg){
            $scope.errorMessage = msg+" ("+file+")";
        }

        $scope.closePreview = function() {
            $scope.noticePreview = false;
            $location.path('/assets');
        }
}])

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
