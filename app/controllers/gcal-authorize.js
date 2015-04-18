'use strict;'

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    passport = require('passport'),
    config = require('../../config/config'),
    assets = require('./assets');


passport.use(new GoogleStrategy({
        clientID: config.gCalendar.CLIENT_ID,
        clientSecret: config.gCalendar.CLIENT_SECRET,
        callbackURL: config.gCalendar.REDIRECT_URL,
        scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
    },
    function (accessToken, refreshToken, params, profile, done) {
        var data = {
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                expiry_date: ((new Date()).getTime() + (params.expires_in * 1000)),
                token_type: params.token_type
            },
            profile: profile._json,
            selectedEmail: profile._json.email
        }
        return done(null, data);
    }
));

exports.gCalAuthorize = function (req, res, next) {
    //hack as there is no parameter to change it
    req._passport.instance._strategies.google._callbackURL = (config.https ? 'https' : 'http') +
    '://' + req.installation + config.gCalendar.REDIRECT_BASE_URL;
    //console.log(req.url);
    var obj = {
        accessType: 'offline',
        approvalPrompt: 'force',
        session: false,
        loginHint: req.query['email']
    };

    passport.authenticate('google', obj, function (err, user, info) {
    })(req, res, next);
}

exports.gCalCallback = function (req, res, next) {
    passport.authenticate('google', {session: false, failureRedirect: '/login'}, function (err, user, info) {
        //store the tokens in a file using assets controller
        var fname = req.installation + '/' + user.profile.email.slice(0, user.profile.email.indexOf('@')) + '.gcal';
        assets.createAssetFileFromContent(fname, user, function (err) {
            if (err)
                console.log(err);
            res.redirect('/assets');
        })

    })(req, res, next);
}

