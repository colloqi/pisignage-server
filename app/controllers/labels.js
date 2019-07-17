'use strict;'

var config = require('../../config/config'),
    Label = require('../models/nedb-models').Label,

    rest = require('../others/restware'),
    _ = require('lodash'),

    path = require('path'),
    async = require('async');

//Load a object
exports.loadObject = function (req, res, next, id) {

    Label.find({_id:id}, function (err, object) {
        if (err || !object)
            return rest.sendError(res,'Unable to get group details',err);

        req.object = object[0];
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
    //criteria['mode'] = req.query('mode') || null;

    var page = req.query['page'] > 0 ? req.query['page'] : 0
    var perPage = req.query['per_page'] || 500

    var options = {
        perPage: perPage,
        page: page,
        criteria: criteria
    }

    Label.find().skip(page*perPage).limit(perPage).exec( function (err, labels) {
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

    var object = req.body;
    Label.setDefaults(object)
    //object.installation = req.installation;
    if (req.user) {
        object.createdBy = req.user._id;  //creator of entity
    }
    Label.update({_id:object._id},object, {upsert: true},function (err, data) {
        if (err) {
            return rest.sendError(res, 'Error in saving new Label', err || "");
        } else {
            return rest.sendSuccess(res, 'new Label added successfully', object);
        }
    })
}

exports.updateObject = function (req, res) {
    var object = req.object;
    delete req.body.__v;        //do not copy version key
    object = _.extend(object, req.body)
    Label.update({_id:object._id},object,{},function (err, data) {
        if (err)
            return rest.sendError(res, 'Unable to update Label', err);
        return rest.sendSuccess(res, 'updated Label details', object);
    });
};


exports.deleteObject = function (req, res) {

    var object = req.object;
    Label.remove({_id:object._id},function (err) {
        if (err)
            return rest.sendError(res, 'Unable to remove Label', err);
        else
            return rest.sendSuccess(res, 'Label deleted successfully');
    })
}
