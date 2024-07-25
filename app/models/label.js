/**
 * Module dependencies.
 */

const mongoose = require('mongoose'),
    Schema = mongoose.Schema

/**
 * Setters and Getters
 */

/**
 * Post Schema
 */
const LabelSchema = new Schema({
    name:                   {type: String,unique: true, index: true},
    mode:                   {type: String},

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
})

LabelSchema.path("name").validate(function (name) {
    return name.length > 0;
}, "name cannot be blank");


/**
 * Pre & Post method hooks
 */
/**
 * Pre-remove hook
 */


/**
 * Statics
 */

LabelSchema.statics = {
    /**
     * Find article by id
     *
     * @param {ObjectId} id
     * @api private
     */

    load: async function (id) {
        return await this.findById(id);
    },

    /**
     * List articles
     *
     * @param {Object} options
     * @api private
     */

    list: async function (options) {
        const criteria = options.criteria || {};

        return await this.find(criteria)
            .sort({ name: 1 }) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page);
    },
};

mongoose.model('Label', LabelSchema)

