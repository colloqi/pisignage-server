'use strict;'

var mongoose = require('mongoose'),
    Group = mongoose.model('Group'),

    fs = require('fs'),
    config = require('../../config/config'),

    rest = require('../others/restware'),
    _ = require('lodash'),

    path = require('path'),
    async = require('async');

var serverMain = require('./server-main');

exports.newGroup = function (group, cb) {

    var object = new Group(group);
    //create a sync folder under sync_folder
    fs.mkdir(path.join(config.syncDir, object.name), function (err) {
        if (err && (err.code != 'EEXIST'))
            return cb('Unable to create a group folder in server: ' + err);
        else {
            object.save(function (err, data) {
                cb(err, data);
            })
        }
    });
}

//Load a object
exports.loadObject = function (req, res, next, id) {

    Group.load(id, function (err, object) {
        if (err)
            return next(err)
        if (!object)
            return next(new Error('not found'))
        req.object = object;
        next();
    })
}

//list of objects
exports.index = function (req, res) {

    var criteria = {};

    if (req.param('string')) {
        var str = new RegExp(req.param('string'), "i")
        criteria['name'] = str;
    }

    var page = req.param('page') > 0 ? req.param('page') : 0
    var perPage = req.param('per_page') || 50

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Group.list(options, function (err, groups) {
        if (err)
            return rest.sendError(res, 'Unable to get Group list', err);
        else
            return rest.sendSuccess(res, 'sending Group list', groups);
    })
}

exports.getObject = function (req, res) {

    var object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Group details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Group details', err);
    }

};

exports.createObject = function (req, res) {

    var object = req.body;
    exports.newGroup(object, function (err, data) {
        if (err)
            return rest.sendError(res, err);
        else
            return rest.sendSuccess(res, 'new Group added successfully', data);
    })
}

exports.updateObject = function (req, res) {

    var saveObject = function (err, group) {
        if (err) {
            return rest.sendError(res, 'Unable to deploy to Group', err);
        } else {
            if (req.body.deploy) {
                group.lastDeployed = Date.now();
                Group.update({_id: group._id}, {$set: {lastDeployed: group.lastDeployed}}).exec();
            }
            return rest.sendSuccess(res, 'updated Group details', group);
        }
    }

    var object = req.object;
    object = _.extend(object, req.body);

    object.save(function (err, data) {
        if (!err && req.body.deploy) {
            serverMain.deploy(object, saveObject);
        } else {
            saveObject(err, object);
        }
    });

};


exports.deleteObject = function (req, res) {

    var object = req.object;
    object.remove(function (err) {
        if (err)
            return rest.sendError(res, 'Unable to remove Group record', err);
        else
            return rest.sendSuccess(res, 'Group record deleted successfully');
    })
}
