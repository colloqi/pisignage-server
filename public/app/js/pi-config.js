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
            calendars:       base + 'api/calendars/',
            links:           base + 'api/links/',

            playlists:       base + 'api/playlists/',

            groups:          base + 'api/groups/',

            players:         base + 'api/players/',
            labels:          base + 'api/labels/' ,

            pishell:         base + 'api/pishell/',
            swupdate:        base + 'api/swupdate/'

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
