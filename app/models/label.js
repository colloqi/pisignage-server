import mongoose from 'mongoose';
const { Schema } = mongoose;


const LabelSchema= new Schema({
    name:                   {type: String,unique: true, required: true, minlength: 1},
    mode:                   {type: String},

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}
);


/**
 * Statics
 */

LabelSchema.statics = {
    async load(id) {
        return await this.findById(id);
    },

    async list(options) {
        const criteria = options.criteria || {};
    
        return await this.find(criteria)
            .sort({ name: 1 })
            .skip(options.perPage * options.page)
            .limit(options.perPage)
            .exec();  
    }
}; 

export const Label = mongoose.model('Label', LabelSchema);