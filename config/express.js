'use strict';

var express = require('express'),
    path = require('path'),
    config = require('./config'),
    serveIndex = require('serve-index');

var favicon = require('serve-favicon'),             //express middleware
    errorHandler = require('errorhandler'),
    logger = require('morgan'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    cookieParser = require('cookie-parser');


var auth = require('http-auth'),
    digest = auth.basic({
        realm:  "pisignage",
        file:   path.join(config.dataDir,"/htpasswd")
    });

//CORS middleware  , add more controls for security like site names, timeout etc.
var allowCrossDomain = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length, X-Requested-With,origin,accept,Authorization');

    if (req.method == 'OPTIONS') {
        res.send(200);
    }
    else {
        next();
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
        app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    };

    app.use(auth.connect(digest));      //can specify specific routes for auth also
    app.use('/sync_folders',serveIndex(config.syncDir));
    app.use('/sync_folders',express.static(config.syncDir));

    app.use('/media', express.static(path.join(config.mediaDir)));
    app.use(express.static(path.join(config.root, 'public')));

    app.set('view engine', 'jade');
    app.locals.basedir = config.viewDir; //for jade root

    app.set('views', config.viewDir);

    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multer({dest: config.uploadDir}));
    app.use(methodOverride());

    app.use(cookieParser());

    app.use(require('./routes'));

    // custom error handler
    app.use(function (err, req, res, next) {
        if (~err.message.indexOf('not found')) return next();
        //ignore range error as well
        if (~err.message.indexOf('Requested Range Not Satisfiable')) return res.send();
        console.error(err.stack)
        res.status(500).render('500')
    })

    app.use(function (req, res, next) {
        //res.redirect('/');
        res.status(404).render('404', {url: req.originalUrl})
    })
};
