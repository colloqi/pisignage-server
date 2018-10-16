/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema

/**
 * Setters and Getters
 */

/**
 * Post Schema
 */
var LabelSchema= new Schema({
    name:                   {type: String,unique: true, index: true},
    mode:                   {type: String},

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
})

LabelSchema.path('name').validate(function (name) {
    return name.length > 0
}, 'name cannot be blank')


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
     * @param {Function} cb
     * @api private
     */

    load: function (id, cb) {
        this.findOne({ _id: id })
            .exec(cb)
    },

    /**
     * List articles
     *
     * @param {Object} options
     * @param {Function} cb
     * @api private
     */

    list: function (options, cb) {
        var criteria = options.criteria || {}

        this.find(criteria)
            .sort({name: -1}) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(cb)
    }
}

mongoose.model('Label', LabelSchema)

