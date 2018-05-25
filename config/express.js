'use strict';

var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    config = require('./config'),
    serveIndex = require('serve-index');

var favicon = require('serve-favicon'),             //express middleware
    errorHandler = require('errorhandler'),
    logger = require('morgan'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser');



//CORS middleware  , add more controls for security like site names, timeout etc.
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Vary', "Origin");   //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Methods', 'HEAD,GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length, X-Requested-With,origin,accept,Authorization,x-access-token,Last-Modified');

    if (req.method == 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
}

var basicHttpAuth = function(req,res,next) {

    var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64

    if(!auth) {     // No Authorization header was passed in so it's the first time the browser hit us

        // Sending a 401 will require authentication, we need to send the 'WWW-Authenticate' to tell them the sort of authentication to use
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        res.end('<html><body>Authentication required to access this path</body></html>');

    } else {

        var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part

        var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
        var plain_auth = buf.toString();        // read it back out as a string

        //console.log("Decoded Authorization ", plain_auth);

        // At this point plain_auth = "username:password"

        var creds = plain_auth.split(':');      // split on a ':'
        var username = creds[0];
        var password = creds[1];

        var pathComponents = req.path.split('/');
        //console.log(pathComponents);

        require('../app/controllers/licenses').getSettingsModel(function(err,settings){
            if( (!settings.authCredentials) ||
                (!settings.authCredentials.user || username == settings.authCredentials.user) &&
                (!settings.authCredentials.password || password == settings.authCredentials.password)) {
                //console.log("http request authorized for download for "+req.path);
                next();
            } else {
                console.log("http request rejected for download for "+req.path);
                res.statusCode = 401;   // or alternatively just reject them altogether with a 403 Forbidden
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Authentication required to access this path</body></html>');
            }
        })
    }
}

module.exports = function (app) {

    //CORS related  http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
    app.use(allowCrossDomain);

    if (process.env.NODE_ENV == 'development') {

        // Disable caching of scripts for easier testing
        app.use(function noCache(req, res, next) {
            if (req.url.indexOf('/scripts/') === 0) {
                res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.header('Pragma', 'no-cache');
                res.header('Expires', 0);
            }
            next();
        });
        app.use(errorHandler());
        app.locals.pretty = true;
        app.locals.compileDebug = true;
    }

    if (process.env.NODE_ENV == 'production') {
        app.use(favicon(path.join(config.root, 'public/app/img', 'favicon.ico')));
    };

    //app.use(auth.connect(digest));      //can specify specific routes for auth also
    app.use(basicHttpAuth);

    //app.use('/sync_folders',serveIndex(config.syncDir));
    app.use('/sync_folders',function(req, res, next){
            fs.stat(path.join(config.syncDir,req.path), function(err, stat){
                if (!err && stat.isDirectory()) {
                    res.setHeader('Last-Modified', (new Date()).toUTCString());
                }
                next();
            })
        },
        serveIndex(config.syncDir)
    );
    app.use('/sync_folders',express.static(config.syncDir));
    app.use('/releases',express.static(config.releasesDir));
    app.use('/licenses',express.static(config.licenseDir));

    app.use('/media', express.static(path.join(config.mediaDir)));
    app.use(express.static(path.join(config.root, 'public')));

    app.set('view engine', 'jade');
    app.locals.basedir = config.viewDir; //for jade root

    app.set('views', config.viewDir);

    //app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride());

    app.use(cookieParser());

    app.use(require('./routes'));

    // custom error handler
    app.use(function (err, req, res, next) {
        if (err.message.indexOf('not found') >= 0)
            return next();
        //ignore range error as well
        if (err.message.indexOf('Range Not Satisfiable') >=0 )
            return res.send();
        console.error(err.stack)
        res.status(500).render('500')
    })

    app.use(function (req, res, next) {
        //res.redirect('/');
        res.status(404).render('404', {url: req.originalUrl})
    })
};
