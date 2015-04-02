'use strict';

angular.module('piServerApp', [
    'ui.router',
    'ui.bootstrap',
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
                    "left1": {
                        templateUrl: '/app/partials/groups.html',
                        controller: 'GroupsCtrl'
                    },
                    "main1": {
                        templateUrl: 'app/partials/players.html',
                        controller: 'ServerPlayerCtrl'
                    }
                }
            })

            .state("home.groupsDetails", {
                url: "players/:group",
                views: {
                    "left1": {
                        templateUrl: '/app/partials/groups.html',
                        controller: 'GroupsCtrl'
                    },
                    "main1": {
                        templateUrl: '/app/partials/group-details.html',
                        controller: 'GroupDetailCtrl'
                    },
                    "main2": {
                        templateUrl: '/app/partials/players.html',
                        controller: 'ServerPlayerCtrl'
                    }
                }
            })

            .state("home.assets", {
                url: "assets",
                views: {
                    "left1": {
                        templateUrl: '/app/partials/playlists.html',
                        controller: 'PlaylistsCtrl'
                    },
                    "left2": {
                        templateUrl: '/app/partials/labels.html',
                        controller: 'LabelsCtrl'
                    },
                    "main1": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsCtrl'
                    }
                }
            })

            .state("home.playlistDetails", {
                url: "assets/:playlist",
                views: {
                    "left1": {
                        templateUrl: '/app/partials/playlists.html',
                        controller: 'PlaylistsCtrl'
                    },
                    "left2": {
                        templateUrl: '/app/partials/labels.html',
                        controller: 'LabelsCtrl'
                    },
                    "main1": {
                        templateUrl: '/app/partials/assets.html',
                        controller: 'AssetsCtrl'
                    }
                }
            })

            .state("home.assets_edit", {
                url: "assets/edit",
                templateUrl: '/app/partials/assets/_edit.html',
                controller: 'AssetsEditCtrl',

                showBackButton: true

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

            .state("home.playlists", {
                url: "playlists",
                templateUrl: '/app/partials/playlists/_list.html',
                controller: 'PlaylistsCtrl'
            })


            .state("home.playlists_edit", {
                url: "playlists/edit",
                templateUrl: '/app/partials/playlists/_edit.html',
                controller: 'PlaylistsEditCtrl',

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