'use strict;' // REMOVE WHEN require USAGE IS REPLACED WITH import STATEMENTS

const mongoose = require('mongoose'),
    Group = mongoose.model('Group'),
    Player = mongoose.model('Player'),

    fs = require('fs').promises,
    config = require('../../config/config'),

    restwareSendSuccess = require('../others/restware').sendSuccess,
    restwareSendError = require('../others/restware').sendError,

    _ = require('lodash'),

    path = require('path');

const serverMain = require('./server-main'),
    licenses = require('./licenses');

let installation;

licenses.getSettingsModel((error, settings) => {
    installation = settings.installation || "local";
});

/* CREATE NEW GROUP --------------------------------------------------------- */
exports.newGroup = async (group) => {
    let object;

    try {
        const groupData = await Group.findOne({ name: group.name });

        if (!groupData) {
            object = new Group(group);
        } else {
            object = _.extend(groupData, group);
        }
    } catch (error) {
        object = new Group(group);
    }

    if (!object.name) {
        console.error("Group name cannot be null");
        throw new Error("Unable to create a group folder in server");
    }

    try {
        await fs.mkdir(
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

/* LOAD GROUP MIDDLEWARE ------------------------------------------------ */
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

/* LOAD LIST OF GROUPS ------------------------------------------------- */
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

/* GET GROUP DETAILS ---------------------------------------------------- */
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

/* CREATE NEW GROUP ------------------------------------------------------ */
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


/* RENAME (update) AND DEPLOY ---------------------------------------------- */
exports.updateObject = async (req, res) => {
    let object = req.object;
    const oldGroupName = object.name;
    const newGroupName = req.body.name;

    delete req.body.__v; //do not copy version key

    object = _.extend(object, req.body);

    try {
        if (oldGroupName !== newGroupName) {
            await Player.updateMany(
                { "group.name": oldGroupName },
                { $set: { "group.name": newGroupName } }
            );

            await fs.rename(
                path.join(config.syncDir, installation, oldGroupName),
                path.join(config.syncDir, installation, newGroupName)
            );
        }
    } catch (error) {
        console.error({ error });
        return restwareSendError(res, error.message);
    }

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

/* SUPPORTING FUNCTION TO DELETE DIRECTORY ----------------------------------- */
const deleteDirectory = async (dirPath) => {
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.lstat(filePath);

            if (stat.isDirectory()) {
                await deleteDirectory(filePath);
            } else {
                await fs.unlink(filePath);
            }
        }
        await fs.rmdir(dirPath);
        console.log(`Directory "${dirPath}" has been deleted`);
    } catch (error) {
        console.error(`Error while deleting "${dirPath}": ${error}`);
    }
};

/* DELETE GROUP ---------------------------------------------------------------- */
exports.deleteObject = async (req, res) => {
    if (!req.object || req.object.name == "default")
        return restwareSendError(
            res,
            "No group specified or can not remove default group"
        );

    const existingPlayersInThisGroup = await Player.find({
        "group.name": req.object.name,
    });

    if (existingPlayersInThisGroup.length === 0) {
        const object = req.object;

        try {
            await object.deleteOne()

            try {
                const pathToSyncFolder = path.join(
                    config.syncDir,
                    installation,
                    req.object.name
                );

                await deleteDirectory(pathToSyncFolder)

            } catch (error) {
                console.error(`Error while deleting ${pathToSyncFolder}`)
            }

            return restwareSendSuccess(
                res,
                "Group record deleted successfully"
            );
        } catch (error) {
            return restwareSendError(
                res,
                "Unable to remove Group record",
                error.message
            );
        }
    } else {
        console.log(
            `Players are assigned to group ${req.object.name}! Move them to other groups before deleting this group!`
        );
        res.status(400);
        return restwareSendError(res, "PLAYERS EXIST");
    }
};
