"use strict"; // REMOVE AFTER MIGRATING require TO import statements

const mongoose = require("mongoose"),
    Label = mongoose.model("Label"),
    rest = require("../others/restware"),
    _ = require("lodash");

// load label middleware ----------------------------------------------------------
exports.loadObject = async (req, res, next, id) => {
    try {
        const label = await Label.load(id);

        if (label) {
            req.object = label;
            next();
        }
    } catch (error) {
        return rest.sendError(
            res,
            "Unable to get label details",
            error.message
        );
    }
};

// get all labels -----------------------------------------------------------------
exports.index = async (req, res) => {
    const criteria = {};

    if (req.query["string"]) {
        const str = new RegExp(req.query["string"], "i");
        criteria["name"] = str;
    }

    const page = req.query["page"] > 0 ? req.query["page"] : 0;
    const perPage = req.query["per_page"] || 500;

    const options = {
        perPage,
        page,
        criteria,
    };

    try {
        const labels = await Label.list(options);
        return rest.sendSuccess(res, "sending Label list", labels);
    } catch (error) {
        return rest.sendError(res, "Unable to get Label list", error.message);
    }
};

// get single label ---------------------------------------------------------------
exports.getObject = (req, res) => {
    const object = req.object;

    if (object) {
        return rest.sendSuccess(res, "Label details", object);
    } else {
        return rest.sendError(res, "Unable to retrieve Label details");
    }
};

// create new label --------------------------------------------------------------
exports.createObject = async (req, res) => {
    const object = new Label(req.body);

    if (req.user) {
        object.createdBy = req.user._id; // creator of new label
    }

    try {
        const labelData = await object.save();
        return rest.sendSuccess(res, "new Label added successfully", labelData);
    } catch (error) {
        return rest.sendError(
            res,
            "Error in saving new Label",
            error.message || ""
        );
    }
};

// update label -----------------------------------------------------------------
exports.updateObject = async (req, res) => {
    let object = req.object;

    delete req.body.__v; // do not copy version key

    object = _.extend(object, req.body);

    try {
        const labelSaveData = await object.save();
        return rest.sendSuccess(res, "updated Label details", labelSaveData);
    } catch (error) {
        return rest.sendError(res, "Unable to update Label", error.message);
    }
};

// delete label -----------------------------------------------------------------
exports.deleteObject = async (req, res) => {
    const object = req.object;

    try {
        await object.deleteOne();
        return rest.sendSuccess(res, "Label deleted successfully");
    } catch (error) {
        return rest.sendError(res, "Unable to remove Label", error.message);
    }
};
