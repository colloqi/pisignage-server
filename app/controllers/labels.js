import mongoose from 'mongoose';
import * as rest from '../others/restware.js';
import { Label } from '../models/label.js';

export const loadObject = async (req, res, next, id) => {
    try {
        const object = await Label.load(id);
        
        if (!object) {
            return rest.sendError(res, 'Unable to get label details', new Error('Label not found'));
        }

        req.object = object;
        return next();
    } catch (err) {
        return rest.sendError(res, 'Unable to get label details', err);
    }
};

export const index = async (req, res) => {
    const criteria = {};

    if (req.query.string) {
        const str = new RegExp(req.query.string, 'i');
        criteria.name = str;
    }

    const page = req.query.page > 0 ? Number(req.query.page) : 0;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 500;

    const options = { perPage, page, criteria };

    try {
        const labels = await Label.list(options);
        return rest.sendSuccess(res, 'Sending Label list', labels);
    } catch (err) {
        return rest.sendError(res, 'Unable to get Label list', err);
    }
};

export const getObject = async (req, res) => {
    try {
        const object = req.object;
        if (object) {
            return rest.sendSuccess(res, 'Label details', object);
        }
        return rest.sendError(res, 'Unable to retrieve Label details');
    } catch (err) {
        return rest.sendError(res, 'Unable to retrieve Label details', err);
    }
};

export const createObject = async (req, res) => {
    try {
        const object = new Label(req.body);
        
        if (req.user) {
            object.createdBy = req.user._id;
        }
        
        const data = await object.save();
        return rest.sendSuccess(res, 'New Label added successfully', data);
    } catch (err) {
        return rest.sendError(res, 'Error in saving new Label', err);
    }
};

export const updateObject = async (req, res) => {
    try {
        const object = req.object;
        delete req.body.__v;

        Object.assign(object, req.body);

        const data = await object.save();
        return rest.sendSuccess(res, 'updated Label details', data);
    } catch (err) {
        return rest.sendError(res, 'Unable to update Label', err);
    }
};

export const deleteObject = async (req, res) => {
    try {
        const object = req.object;
        
        await object.deleteOne();
        return rest.sendSuccess(res, 'Label deleted successfully');
    } catch (err) {
        return rest.sendError(res, 'Unable to remove Label', err);
    }
};