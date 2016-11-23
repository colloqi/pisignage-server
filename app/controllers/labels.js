'use strict;'

var mongoose = require('mongoose'),
    Label = mongoose.model('Label'),

    config = require('../../config/config'),

    rest = require('../others/restware'),
    _ = require('lodash'),

    path = require('path'),
    async = require('async');

//Load a object
exports.loadObject = function (req, res, next, id) {

    Label.load(id, function (err, object) {
        if (err || !object)
            return rest.sendError(res,'Unable to get group details',err);

        req.object = object;
        next();
    })
}

//list of objects
exports.index = function (req, res) {

    var criteria = {};

    if (req.query['string']) {
        var str = new RegExp(req.query['string'], "i")
        criteria['name'] = str;
    }
    //criteria['mode'] = req.param('mode') || null;

    var page = req.query['page'] > 0 ? req.query['page'] : 0
    var perPage = req.query['per_page'] || 500

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Label.list(options, function (err, labels) {
        if (err)
            return rest.sendError(res, 'Unable to get Label list', err);
        else
            return rest.sendSuccess(res, 'sending Label list', labels);
    })
}

exports.getObject = function (req, res) {

    var object = req.object;
    if (object) {
        return rest.sendSuccess(res, 'Label details', object);
    } else {
        return rest.sendError(res, 'Unable to retrieve Label details', err);
    }

};

exports.createObject = function (req, res) {

    var object = new Label(req.body);
    //object.installation = req.installation;
    if (req.user) {
        object.createdBy = req.user._id;  //creator of entity
    }
    object.save(function (err, data) {
        if (err) {
            return rest.sendError(res, 'Error in saving new Label', err || "");
        } else {
            return rest.sendSuccess(res, 'new Label added successfully', data);
        }
    })
}

exports.updateObject = function (req, res) {
    var object = req.object;
    delete req.body.__v;        //do not copy version key
    object = _.extend(object, req.body)
    object.save(function (err, data) {
        if (err)
            return rest.sendError(res, 'Unable to update Label', err);
        return rest.sendSuccess(res, 'updated Label details', data);
    });
};


exports.deleteObject = function (req, res) {

    var object = req.object;
    object.remove(function (err) {
        if (err)
            return rest.sendError(res, 'Unable to remove Label', err);
        else
            return rest.sendSuccess(res, 'Label deleted successfully');
    })
}
