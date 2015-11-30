var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var GroupSchema = new Schema({
    name:                   {type: String,index: true},
    description:            String,

    playlists:              [],
    assets:                 [],
    lastDeployed:           String,

    orientation:            {type: String,default: 'landscape'},
    animationEnable:        {type: Boolean, default: false},
    signageBackgroundColor: {type: String, default: "#000"},
    urlReloadDisable:       {type: Boolean, default: false},
    resolution:             {type: String,default: '720p'},
    sleep: {
                            enable: {type: Boolean, default: false},
                            ontime: {type: String},
                            offtime: {type: String},
                            ontimeObj: {type: String},
                            offtimeObj: {type: String}
    },

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
})


GroupSchema.path('name').validate(function (name) {
    return name.length > 0
}, 'name cannot be blank')

GroupSchema.statics = {

    load: function (id, cb) {
        this.findOne({ _id: id })
            .exec(cb)
    },

    list: function (options, cb) {
        var criteria = options.criteria || {}

        this.find(criteria)
            .sort({_id: -1}) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(cb)
    }
}

mongoose.model('Group', GroupSchema)

