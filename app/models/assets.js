import mongoose from 'mongoose';
const { Schema } = mongoose;

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
});

AssetSchema.index({ createdAt: -1 });


AssetSchema.statics = {
    async load(id) {
        return await this.findById(id);
    },

    async list(options) {
        const criteria = options.criteria || {};

        return await this.find(criteria)
            .sort({ createdAt: 1 }) // sort by date
            .skip(options.perPage * options.page)
            .limit(options.perPage)
            .exec();
    }
};


export const Asset = mongoose.model('Asset', AssetSchema);