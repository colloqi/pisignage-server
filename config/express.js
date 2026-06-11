import express from 'express';
import path from 'path';
import fs from 'fs';
import config from './config.js';
import serveIndex from 'serve-index';

import favicon from 'serve-favicon';
import errorHandler from 'errorhandler';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { getSettingsModel } from '../app/controllers/licenses.js';
import routes from './routes.js';
import { promises as fsPromises } from 'fs';



//CORS middleware  , add more controls for security like site names, timeout etc.
const allowCrossDomain = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Vary', "Origin");   // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Methods', 'HEAD,GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Content-Length,Response-Type, X-Requested-With,origin,accept,Authorization,x-access-token,Last-Modified');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};


const basicHttpAuth = async (req, res, next) => {
    // The /v2 React UI manages auth itself (credentials in sessionStorage,
    // sent as an Authorization header on API/socket calls). The browser cannot
    // attach that header to the initial HTML document load or to <img>/media
    // requests, so let the /v2 shell and the media it references load without
    // Basic auth. The /api endpoints below stay protected.
    if (req.path === '/v2' || req.path.startsWith('/v2/') || req.path.startsWith('/media/')) {
        return next();
    }

    const auth = req.headers['authorization'];  // auth is in base64(username:password)

    if (!auth) {  // No Authorization header was passed in
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        res.end('<html><body>Authentication required to access this path</body></html>');
    } else {
        try {
            const tmp = auth.split(' ');   // e.g., "Basic Y2hhcmxlczoxMjM0NQ=="
            const buf = Buffer.from(tmp[1], 'base64');
            const plain_auth = buf.toString();     // "username:password"

            const creds = plain_auth.split(':');
            const username = creds[0];
            const password = creds[1];

            const pathComponents = req.path.split('/');
            // console.log(pathComponents);

            const settings = await getSettingsModel();
            if ((!settings.authCredentials) ||
                (!settings.authCredentials.user || username === settings.authCredentials.user) &&
                (!settings.authCredentials.password || password === settings.authCredentials.password)) {
                next();
            } else {
                res.statusCode = 401;   // or use 403 Forbidden
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
                res.end('<html><body>Authentication required to access this path</body></html>');
            }
        } catch (err) {
            console.error('Error loading settings:', err);
            res.statusCode = 401;   // or use 500 if you prefer to fail closed
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.end('<html><body>Authentication required to access this path</body></html>');
        }
    }
};

export default (app) => {

    // CORS related  http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
    app.use(allowCrossDomain);

    // v2 React UI is the primary console — send the site root to it.
    // Registered before basicHttpAuth so the redirect itself isn't gated by the
    // Basic-auth prompt (the /v2 shell handles its own login).
    app.get('/', (_req, res) => res.redirect('/v2/'));

    if (process.env.NODE_ENV === 'development') {

        // Disable caching of scripts for easier testing
        app.use((req, res, next) => {
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

    if (process.env.NODE_ENV === 'production') {
        app.use(favicon(path.join(config.root, 'public/app/img', 'favicon.ico')));
    }

    // app.use(auth.connect(digest));      // can specify specific routes for auth also
    app.use(basicHttpAuth);

    // app.use('/sync_folders',serveIndex(config.syncDir));
    app.use('/sync_folders', async (req, res, next) => {
            // Player uses --no-cache header in wget to download assets. The --no-cache flag sends the following headers
            // Cache-Control: no-cache , Pragma: no-cache
            // This causes 200 OK response for all requests. Hence remove this header to minimise data-transfer costs.
            delete req.headers['cache-control'];  // delete header
            delete req.headers['pragma'];  // delete header
            
            try {
                const stat = await fsPromises.stat(path.join(config.syncDir, req.path));
                if (stat.isDirectory()) {
                    res.setHeader('Last-Modified', (new Date()).toUTCString());
                }
            } catch (err) {
                // File/directory doesn't exist or error - continue anyway
            }
            next();
        },
        serveIndex(config.syncDir)
    );
    app.use('/sync_folders', express.static(config.syncDir));
    app.use('/releases', express.static(config.releasesDir));
    app.use('/licenses', express.static(config.licenseDir));

    app.use('/media', express.static(path.join(config.mediaDir)));
    app.use(express.static(path.join(config.root, 'public')));

    app.set('view engine', 'pug');
    app.locals.basedir = config.viewDir; // for jade root

    app.set('views', config.viewDir);

    // app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(methodOverride());

    app.use(cookieParser());

    app.use(routes());

    // /v2 single-page app: serve the React shell for client-side routes such as
    // /v2/players so deep links and refreshes resolve. Requests for real built
    // assets (they carry a file extension) fall through to express.static above
    // / the 404 handler below.
    app.get(/^\/v2(\/.*)?$/, (req, res, next) => {
        if (path.extname(req.path)) return next();
        res.sendFile(path.join(config.root, 'public', 'v2', 'index.html'));
    });

    // custom error handler
    app.use((err, req, res, next) => {
        if (err.message.indexOf('not found') >= 0)
            return next();
        // ignore range error as well
        if (err.message.indexOf('Range Not Satisfiable') >= 0)
            return res.send();
        console.error(err.stack);
        res.status(500).render('500');
    });

    app.use((req, res, next) => {
        // res.redirect('/');
        res.status(404).render('404', { url: req.originalUrl });
    });
};
