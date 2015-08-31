'use strict';

angular.module('piServerApp', [
    'ui.router',
    'ui.bootstrap',
    'ui.sortable',
    'angularjs-dropdown-multiselect',
    'piConfig',
    'piIndex.controllers',
    'piGroups.controllers',
    'piAssets.controllers',
    'piPlaylists.controllers',
    'piLabels.controllers',
    'pisignage.directives',
    'pisignage.services'
])
    .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {

        $urlRouterProvider.otherwise('/players/players');

        $stateProvider

            .state("home", {
                abstract: true,
                url: "/",
                templateUrl: 'app/partials/menu.html',
                controller: 'IndexCtrl'

            })

            .state("home.players", {
                abstract: true,
                url: "players/",
                views: {
                    "main": {
                        templateUrl: 'app/partials/assets-main.html',
                        controller: 'ServerPlayerCtrl'
                    }
                }
            })

            .state("home.players.players", {
                url: "players",
                views: {
                    "left": {
                        templateUrl: '/app/partials/groups.html',
                        controller: 'GroupsCtrl'
                    },
                    "list": {
                        templateUrl: 'app/partials/players.html'
                    }
                }
            })

            .state("home.players.playerGroupsDetails", {
                url: "players/:group",
                views: {
                    "left": {
                        templateUrl: '/app/partials/groups.html',
                        controller: 'GroupsCtrl'
                    },
                    "details": {
                        templateUrl: '/app/partials/group-details.html',
                        controller: 'GroupDetailCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/players.html'
                    }
                }
            })

            .state("home.assets", {
                abstract: true,
                url: "assets/",
                views: {
                    "main": {
                        templateUrl: 'app/partials/assets-main.html',
                        controller: 'AssetsCtrl'
                    }
                }
            })

            .state("home.assets.assets", {
                url: "assets",
                views: {
                    "left": {
                        templateUrl: '/app/partials/labels.html',
                        controller: 'LabelsCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsEditCtrl'
                    }
                }
            })

            .state("home.assets.assetLabelDetails", {
                url: "assets/:label",
                views: {
                    "left": {
                        templateUrl: '/app/partials/labels.html',
                        controller: 'LabelsCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsEditCtrl'
                    }
                }
            })

            .state("home.assets.assetDetails", {
                url: "assets/detail/:file",
                views: {
                    "left": {
                        templateUrl: '/app/partials/labels.html',
                        controller: 'LabelsCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/asset-details.html',
                        controller: 'AssetViewCtrl'
                    }
                }
            })

            .state("home.assets.playlists", {
                url: "playlists",
                views: {
                    "left": {
                        templateUrl: '/app/partials/playlists.html',
                        controller: 'PlaylistsCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsEditCtrl'
                    }
                }
            })

            .state("home.assets.playlistDetails", {
                url: "playlists/:playlist",
                views: {
                    "left": {
                        templateUrl: '/app/partials/playlists.html',
                        controller: 'PlaylistsCtrl'
                    },
                    "details": {
                        templateUrl: '/app/partials/playlist-details.html',
                        controller: 'PlaylistViewCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsEditCtrl'
                    }
                }
            })

            .state("home.assets.playlistAddAssets", {
                url: "playlists/:playlist/add-assets",
                views: {
                    "left": {
                        templateUrl: '/app/partials/playlists.html',
                        controller: 'PlaylistsCtrl'
                    },
                    "list": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsEditCtrl'
                    },
                    "right": {
                        templateUrl: '/app/partials/playlist-add.html',
                        controller: 'PlaylistAddCtrl'
                    }
                }
            })

        $httpProvider.interceptors.push(function ($q, $rootScope) {

            var onlineStatus = false;

            return {
                'response': function (response) {
                    if (!onlineStatus) {
                        onlineStatus = true;
                        $rootScope.$broadcast('onlineStatusChange', onlineStatus);
                    }
                    return response || $q.when(response);
                },

                'responseError': function (response) {
                    if (onlineStatus) {
                        onlineStatus = false;
                        $rootScope.$broadcast('onlineStatusChange', onlineStatus);
                    }
                    return $q.reject(response);
                }
            };
        });

    })
    .run(function ($window,$modal) {
        var current_browser = $window.navigator.userAgent.toLowerCase();
            if(current_browser.indexOf('chrome') == -1){
                $modal.open({
                    template: [
                        '<div class="modal-header">',
                        '<h3 class="modal-title">Please Switch to Chrome Browser</h3>',
                        '</div>',
                        '<div class="modal-body">',
                        '<p>Things may not work as expected with other Browsers :(</p>',
                        '</div>',
                        '<div class="modal-footer">',
                        '<button ng-click="cancel()" class="btn btn-warning">Got it!</button>',
                        '</div>'
                    ].join(''),
                    controller: ['$scope','$modalInstance',function($scope,$modalInstance){
                        $scope.cancel = function(){
                                $modalInstance.close();
                            }
                        }]
                })
            }
    });