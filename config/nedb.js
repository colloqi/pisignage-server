'use strict';

var Datastore = require('../../config/nedb'),
    util = require('util'),
    db = {};

module.exports = {
    createAndLoad: function(name,cb) {
        db[name] = new Datastore({
            filename: 'path/to/datafile',
            autoload: true,
            onload: function (err) {
                if (err)
                    util.log("Error loading users db, " + err)
                cb(err, db[name]);
            }
        })
        return db[name];
    },
    load: function(id,cb) {

    },
    list: function(options,cb) {

    }
}
