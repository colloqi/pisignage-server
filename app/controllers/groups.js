'use strict;' // REMOVE WHEN require USAGE IS REPLACED WITH import STATEMENTS

const mongoose = require('mongoose'),
    Group = mongoose.model('Group'),

    fs = require('fs'),
    config = require('../../config/config'),

    restwareSendSuccess = require('../others/restware').sendSuccess,
    restwareSendError = require('../others/restware').sendError,
    _ = require('lodash'),

    path = require('path');

const serverMain = require('./server-main'),
    licenses = require('./licenses');

let installation;

licenses.getSettingsModel(function (err, settings) {
    installation = settings.installation || "local";
});

exports.newGroup = async (group) => {
    let object;

    try {
        const groupData = await Group.findOne({ name: group.name });
        console.log("LOG E: ", groupData);
        if (!groupData) {
            object = new Group(group);
            console.log("LOG F: ", { object });
        } else {
            object = _.extend(groupData, group);
        }
    } catch (error) {
        object = new Group(group);
    }

    if (!object.name) {
        console.log("Group name cannot be null");
        throw new Error("Unable to create a group folder in server");
    }

    try {
        await fs.promises.mkdir(
            path.join(config.syncDir, installation, object.name)
        );
    } catch (error) {
        if (error.code != "EEXIST") {
            console.error({ error }, error.code);
            throw new Error(
                `Unable to create a group folder in server: ${error.message}`
            );
        }
    }

    try {
        await object.save();

        return object;
    } catch (error) {
        throw new Error(error.message);
    }
};

//Load an object
exports.loadObject = async (req, res, next, id) => {
    try {
        const object = await Group.load(id);

        if (object) {
            req.object = object;
            next();
        } else {
            return restwareSendError(res, "Unable to get group details");
        }
    } catch (error) {
        return restwareSendError(
            res,
            "Unable to get group details",
            error.message
        );
    }
};

//list of objects
exports.index = async (req, res) => {
    const criteria = {};

    if (req.query["string"]) {
        const str = new RegExp(req.query["string"], "i");
        criteria["name"] = str;
    }

    if (req.query["all"]) {
        criteria["all"] = true;
    }

    const page = req.query["page"] > 0 ? req.query["page"] : 0;
    const perPage = req.query["per_page"] || 500;

    const options = {
        perPage,
        page,
        criteria,
    };

    try {
        const groupsList = await Group.list(options);
        return restwareSendSuccess(res, "sending Group list", groupsList || []);
    } catch (error) {
        return restwareSendError(
            res,
            "Unable to get Group list",
            error.message
        );
    }
};

exports.getObject = (req, res) => {
    const object = req.object;
    try {
        if (object) {
            return restwareSendSuccess(res, "Group details", object);
        } else {
            return restwareSendError(res, "Unable to retrieve Group details");
        }
    } catch (error) {
        return restwareSendError(
            res,
            "Unable to retrieve Group details",
            error.message
        );
    }
};

exports.createObject = async (req, res) => {
    const object = req.body;

    try {
        const newGroupData = await exports.newGroup(object);
        return restwareSendSuccess(
            res,
            "new Group added successfully",
            newGroupData
        );
    } catch (error) {
        return restwareSendError(res, error.message);
    }
};

exports.updateObject = async (req, res) => {
    let object = req.object;

    delete req.body.__v; //do not copy version key

    if (req.body.name && object.name != req.body.name) {
        try {
            await fs.promises.mkdir(
                path.join(config.syncDir, installation, req.body.name)
            );
        } catch (error) {
            if (error.name != "EEXIST")
                console.log(
                    `Unable to create a group folder in server: ${error}`
                );
        }
    }
    object = _.extend(object, req.body);

    if (req.body.deploy) {
        object.deployedPlaylists = object.playlists;
        object.deployedAssets = object.assets;
        object.deployedTicker = object.ticker;
    }

    try {
        await object.save();

        if (req.body.deploy) {
            let deployGroupObject;
            try {
                deployGroupObject = await serverMain.deploy(
                    installation,
                    object
                );
            } catch (error) {
                throw new Error(error.message);
            }
            deployGroupObject.lastDeployed = Date.now();
            await Group.updateOne(
                { _id: deployGroupObject._id },
                {
                    $set: {
                        lastDeployed: deployGroupObject.lastDeployed,
                        assets: deployGroupObject.assets,
                        deployedAssets: deployGroupObject.deployedAssets,
                        assetsValidity: deployGroupObject.assetsValidity,
                    },
                }
            );
        }

        return restwareSendSuccess(res, "Updated Group details", object);
    } catch (error) {
        return restwareSendError(res, error.message);
    }
};

exports.deleteObject = async (req, res) => {
    if (!req.object || req.object.name == "default")
        return restwareSendError(
            res,
            "No group specified or can not remove default group"
        );

    const object = req.object;

    try {
        await object.remove();
        return restwareSendSuccess(res, "Group record deleted successfully");
    } catch (error) {
        return restwareSendError(
            res,
            "Unable to remove Group record",
            error.message
        );
    }
};
