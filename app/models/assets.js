const mongoose = require('mongoose'),
    Schema = mongoose.Schema

const AssetSchema = new Schema({

    name: {type: String, index: true},
    type: String,
    resolution: {width: String, height: String},
    duration: String,
    size: String,
    thumbnail: String,
    labels: [],
    playlists:              [],
    validity:               {enable:Boolean, startdate:String,enddate:String,starthour:Number,endhour:Number},
    createdAt: {type: Date, default: Date.now},
    createdBy: {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
})

AssetSchema.index({ installation: 1 });

AssetSchema.statics = {
    load: async function (id) {
        try {
            return await this.findById(id);
        } catch (error) {
            throw new Error(error);
        }
    },
    list: async function (options) {
        const criteria = options.criteria || {};

        try {
            return await this.find(criteria)
                .sort({ name: 1 }) // sort by date
                .limit(options.perPage)
                .skip(options.perPage * options.page);
        } catch (error) {
            throw new Error(error);
        }
    },
};

const AssetModel = mongoose.model('Asset', AssetSchema)

module.exports = AssetModel