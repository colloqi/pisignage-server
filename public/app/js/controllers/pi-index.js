'use strict';
angular.module('piIndex.controllers', [])

    .controller('IndexCtrl', function ($scope, $rootScope, $location, $http, $state, $modal, $interval, castApi, gettextCatalog, piUrls, piLanguages) {

        $scope.getClass = function (state) {
            if ($state.current.name.indexOf(state) == 0) {
                return "active"
            } else {
                return ""
            }
        }
        //GET req to api/settings
        $http.get(piUrls.settings)
            .then(function(response) {
                var data = response.data;
                if(data.success){
                    $scope.userSetting = data.data;
                    if($scope.userSetting.language &&
                                    $scope.userSetting.language != gettextCatalog.getCurrentLanguage()){ // check language
                        gettextCatalog.setCurrentLanguage($scope.userSetting.language);
                        // setTimeAgoTimezone($scope.userSetting.language);
                        var intervalCanceller = $interval(function () {
                            //issue on reloading state if timeout is not used
                            $interval.cancel(intervalCanceller)
                            $state.go($state.current, {}, {reload: true});
                        }, 0);
                    }
                }
            },function(response){
                console.log(response.status);
            })

        //function is called when lanugage change popup button is clicked
        $scope.languageSelect = function(){
            $scope.languagesList = piLanguages;
            $scope.langModal = $modal.open({
                templateUrl: '/app/templates/languagePopup.html',
                scope: $scope
            });
        }
        //function to change the HTML lang attribute of the page
        function setTimeAgoTimezone (lang) {
            var availableLanguages = ['ca_ES', 'de_DE', 'en_US', 'es_LA', 'fr_FR', 'he_IL', 'hu_HU', 'it_IT', 'nl_NL', 'pl_PL', 'pt_BR', 'sv_SE', 'zh_CN', 'zh_TW']
            for (var i=0,len=availableLanguages.length;i<len;i++) {
                if (availableLanguages[i].indexOf(lang) == 0) {
                    window.document.documentElement.lang = availableLanguages[i];
                    break;
                }
            }
        }
        //function is called when Save button is click inside LanguageChange popup
        $scope.changeLang = function(){
            $http.post(piUrls.settings,$scope.userSetting)
                .then(function(response) {
                    var data = response.data;
                    if(data.success){
                        $scope.userSetting = data.data;
                        $scope.langModal.close();
                        if($scope.userSetting.language &&
                                    ($scope.userSetting.language != gettextCatalog.getCurrentLanguage())){ // check language
                            gettextCatalog.setCurrentLanguage($scope.userSetting.language);
                            setTimeAgoTimezone($scope.userSetting.language);
                            $state.go($state.current, {}, {reload: true});
                        }   
                    }
                },function(response){
                    console.log(response.status);
                })
        }

        $scope.castStatus = castApi.castStatus;

        $scope.launchCastApp = function() {
            if ($scope.castStatus.deviceState == "0")
                castApi.launchApp()
            else
                castApi.stopApp()
        }

    });