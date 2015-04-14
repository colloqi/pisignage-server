'use strict';

angular.module('piServerApp', [
    'ui.router',
    'ui.bootstrap',
    'ui.sortable',
    'angularjs-dropdown-multiselect',
    'piConfig',
    'piIndex.controllers',
    'server.controllers',
    'piGroups.controllers',
    'piAssets.controllers',
    'piPlaylists.controllers',
    'piLabels.controllers',
    'pisignage.directives',
    'pisignage.services'
])
    .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {

        $urlRouterProvider.otherwise('/players');

        $stateProvider

            .state("home", {
                abstract: true,
                url: "/",
                templateUrl: 'app/partials/menu.html',
                controller: 'IndexCtrl'

            })

            .state("home.players", {
                url: "players",
                views: {
                    "left": {
                        templateUrl: '/app/partials/groups.html',
                        controller: 'GroupsCtrl'
                    },
                    "list": {
                        templateUrl: 'app/partials/players.html',
                        controller: 'ServerPlayerCtrl'
                    }
                }
            })

            .state("home.groupsDetails", {
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
                        templateUrl: '/app/partials/players.html',
                        controller: 'ServerPlayerCtrl'
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
                },
                resolve:{
                    assetParam: ['$stateParams', function($stateParams){
                        return $stateParams.label || $stateParams.playlist;
                    }]
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
                        templateUrl: '/app/partials/playlist-add.html'
                    }
                }
            })

            .state("home.assets_links", {
                url: "assets/links/:file",
                templateUrl: '/app/partials/assets/_linkFile.html',
                controller: 'LinksCtrl',

                showBackButton: true
            })

            .state("home.assets_calendar", {
                url: "assets/calendars/:file",
                templateUrl: '/app/partials/assets/_calendar.html',
                controller: 'CalendarCtrl',

                showBackButton: true

            })

            .state("home.assets_details", {
                url: "assets/details/:file",
                templateUrl: '/app/partials/assets/_details.html',
                controller: 'AssetViewCtrl',

                showBackButton: true

            })

            .state("home.playlists_details", {
                url: "playlists/details/:file",
                views: {
                    "": {
                        templateUrl: '/app/partials/playlists/_playlist.html',
                        controller: 'PlaylistViewCtrl'
                    },
                    "labels": {
                        templateUrl: '/app/partials/home/_labels.html',
                        controller: 'LabelsCtrl'
                    }
                },
                showBackButton: true

            })

            .state("home.settings", {
                url: "settings",
                templateUrl: '/app/partials/server/_settings.html',
                controller: 'ServerSettingsCtrl'
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
    .run(function () {

    });