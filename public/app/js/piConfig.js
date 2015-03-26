angular.module('piConfig', [])
    .constant('piUrls', (function() {
        var base,protocol;
        //IE fix !
        if (!window.location.origin) {
            window.location.origin =
                window.location.protocol + "//" + window.location.hostname +
                (window.location.port ? ':' + window.location.port: '');
        }
        protocol = window.location.protocol.toLowerCase();
        if (protocol.indexOf("http") != -1 )
            base = window.location.origin+'/';
        else
            base = 'http://localhost/';
        console.log("api base: ",base);
        return {
            files:           base + 'api/files/' ,
            filespostupload: base + 'api/postupload',
            labels:          base + 'api/labels/' ,
            notices:         base + 'api/notices/',
            links:           base + 'api/links/',
            calendars:       base + 'api/calendars/',
            playlists:       base + 'api/playlists/',
            play:            base + 'api/play/playlists/',
            fileplay:        base + 'api/play/files/',
            getStatus:       base + 'api/status/',
            getStats:        base + 'api/getstats/',
            getStatsDetails: base + 'api/getstatsdetails/',
            getConnectStats: base + 'api/getconnectstats/',
            settings:        base + 'api/settings/',
            piswupdate:      base + 'api/piswupdate/',

            players:         base + 'api/players/',
            groups:          base + 'api/groups/',
            pishell:         base + 'api/pishell/',
            swupdate:        base + 'api/swupdate/',

            usernames:       base + 'api/usernames/',
            collaborators:   base + 'api/collaborators/',
            downloadauth:    base + 'api/downloadauth',
            
            users:           base + 'api/users'

        }
    })())
    .constant('piFeatures', (function() {
        return {
            groupEditFeature:               true,
            groupRenameFeature:             false,

            playlistEditFeature:            true,
            playlistRenameFeature:          true,

            assetRenameFeature:             false

        }
    })())

    .constant('piConstants', (function() {
        return {
            videoRegex:     /(mp4|mov|m4v|avi|webm|wmv|flv)$/i,
            imageRegex:     /(jpg|jpeg|png|gif)$/i,
            noticeRegex:    /\.html$/i,
            zipfileRegex:   /(.zip|.gz|.bz2)/i
        }
    })());
