'use strict';

angular.module('piServerApp', [
        'ngResource',
        'ngCookies',
        'ui.router',
        'ui.bootstrap',
        'nvd3ChartDirectives',
        'ngCsv',
        'piConfig',
        'piIndex.controllers',
        'piUser.controllers',
        'server.controllers',
        'piGroups.controllers',
        'piassets.controllers',
        'piplaylist.controllers',
        'pinotice.controllers',
        'piLabels.controllers',
        'pisignage.directives',
        'pisignage.filters',
        'piUser.services',
        'pisignage.services'
    ])
    .config([ '$stateProvider', '$urlRouterProvider','$locationProvider','$httpProvider',
        function ($stateProvider,   $urlRouterProvider,$locationProvider,$httpProvider) {

        // Use $urlRouterProvider to configure any redirects (when) and invalid urls (otherwise)
        $urlRouterProvider.otherwise('/players');

        // Use $stateProvider to configure your states.
        $stateProvider

            .state("home", {
                abstract: true,
                url: "/" ,
                templateUrl: '/app/partials/home/_home-pc.html',
                controller: 'IndexCtrl'

                //resolve: {},
                //views: {}

            })

            .state("home.players", {
                url: "players" ,
                templateUrl: '/app/partials/server/_player.html',
                controller: 'ServerPlayerCtrl'

            })

            .state("home.groups", {
                url: "groups",
                templateUrl: '/app/partials/groups/_groups.html',
                controller: 'GroupsCtrl'
            })

            .state("home.groups_edit", {
                url: "groups/edit",
                templateUrl: '/app/partials/groups/_edit.html',
                controller: 'GroupsEditCtrl',

                showBackButton: true

            })

            .state("home.groups_details", {
                url: "groups/details/:group",
                views: {
                    "": {
                        templateUrl: '/app/partials/groups/_details.html',
                        controller: 'GroupDetailCtrl'
                    },
                    "players": {
                        templateUrl: '/app/partials/server/_player.html',
                        controller: 'ServerPlayerCtrl'
                    }
                },                

                showBackButton: true

            })

            .state("home.groups_players", {
                url: "groups/players/:group",
                templateUrl: '/app/partials/server/_player.html',
                controller: 'ServerPlayerCtrl',

                showBackButton: true

            })


            .state("home.assets", {
                url: "assets",
                views: {
                    "": {
                        templateUrl: '/app/partials/assets/_assets.html',
                        controller: 'AssetsCtrl'
                    },
                    "labels": {
                        templateUrl: '/app/partials/home/_labels.html',
                        controller: 'LabelsCtrl'
                    }
                }
            })

            .state("home.assets_edit", {
                url: "assets/edit",
                templateUrl: '/app/partials/assets/_edit.html',
                controller: 'AssetsEditCtrl',

                showBackButton: true

            })

            .state("home.assets_notice", {
                url: "assets/notices/:file",
                templateUrl: '/app/partials/assets/_notice.html',
                controller: 'NoticeCtrl',

                showBackButton: true

            })
            .state("home.assets_links",{
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

            .state("home.reports", {
                url: "reports",
                templateUrl: '/app/partials/server/_reports.html',
                controller: 'ServerReportsCtrl'
            })

            .state("home.settings", {
                url: "settings",
                templateUrl: '/app/partials/server/_settings.html',
                controller: 'ServerSettingsCtrl'
            })

            .state("login", {
                url: "/login",
                templateUrl: '/app/partials/user/_login.html',
                controller: 'LoginCtrl',

                noauthenticate: true
            })

            .state("signup", {
                url: "/signup",
                templateUrl: '/app/partials/user/_signup.html',
                controller: 'SignupCtrl',

                noauthenticate: true
            })



        $locationProvider.html5Mode(true);

        // Intercept 401s and 403s and redirect you to login
        $httpProvider.interceptors.push(['$q', '$location','$rootScope', function ($q, $location,$rootScope) {

            var onlineStatus = false;

            return {
                'response': function(response) {
                    if (!onlineStatus) {
                        onlineStatus = true;
                        $rootScope.$broadcast('onlineStatusChange',onlineStatus);
                    }
                    return response || $q.when(response);
                },

                'responseError': function (response) {
                    if (onlineStatus) {
                        onlineStatus = false;
                        $rootScope.$broadcast('onlineStatusChange',onlineStatus);
                    }
                    if (response.status === 401 || response.status === 403) {
                        $location.path('/login');
                        return $q.reject(response);
                    }
                    else {
                        return $q.reject(response);
                    }
                }
            };
        }]);

    }])
    .run(['$rootScope', '$state', '$stateParams','$location', 'Auth',
        function ($rootScope,$state, $stateParams, $location, Auth) {

            //add references so that you can access them from any scope within your applications
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;


            // Redirect to login if route requires auth and you're not logged in
            $rootScope.$on('$stateChangeStart', function (event, toState,toParams) {

                if (!toState.noauthenticate && !Auth.isLoggedIn()) {
                    $location.path('/login');
                }

            });
    }]);