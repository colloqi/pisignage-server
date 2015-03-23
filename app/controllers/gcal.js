'use strict;'

var config = require('../../config/config'),
    googleapis = require('googleapis'),
    fs = require('fs'),
    path = require('path');

/*
 ===========================================================================
 Google Calendar Functions
 ===========================================================================
 */

var OAuth2 = googleapis.auth.OAuth2,
    oauth2Client = new OAuth2(config.gCalendar.CLIENT_ID, config.gCalendar.CLIENT_SECRET, config.gCalendar.REDIRECT_URL),
    calendar = googleapis.calendar('v3');

var readGcal = function (file) {
    var fileContents;
    try {
        fileContents = JSON.parse(fs.readFileSync(file, 'utf8'));
        oauth2Client.setCredentials(fileContents.tokens);
    } catch (e) {
        console.log("Unable to set credentials for auth client " + e);
    }
    return fileContents;
}
exports.index = function (calData, cb) {
    oauth2Client.setCredentials(calData.tokens);
    calendar.calendarList.list({minAccessRole: 'owner', auth: oauth2Client}, function (err, calendarList) {
        err ? cb(err) : cb(null, calendarList);
    })
};

exports.getCalendar = function (file, options, cb) {
    var gTokens = readGcal(path.resolve(config.mediaDir, file));   //no need for istallation since it is called from Pi
    options.calendarId = gTokens.selectedEmail;
    options.auth = oauth2Client;
    calendar.events.list(options, function (err, eventsList) {
        err ? cb(err) : cb(null, eventsList);
    });

};