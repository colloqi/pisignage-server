var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var GroupSchema = new Schema({
    name:                   {type: String,index: true},
    description:            String,

    playlists:              [],
    combineDefaultPlaylist: {type: Boolean , default: false},
    playAllEligiblePlaylists: {type: Boolean , default: false},
    randomsort:             {type: Boolean , default:false},
    alternatesort:          {type: Boolean , default: false},
    timeToStopVideo:        {type: Number , default: 0 },
    
    assets:                 [],
    assetsValidity:         [],
    ticker:                 {},

    deployedPlaylists:      [],
    deployedAssets:         [],
    deployedTicker:         {},

    lastDeployed:           String,

    enableMpv:              {type: Boolean, default: false},
    orientation:            {type: String,default: 'landscape'},
    animationEnable:        {type: Boolean, default: false},
    animationType:          {type: String, default: null},
    resizeAssets:           {type: Boolean, default: true},
    videoKeepAspect:        {type: Boolean, default: false},
    imageLetterboxed:       {type: Boolean, default: false},
    signageBackgroundColor: {type: String, default: "#000"},
    urlReloadDisable:       {type: Boolean, default: true},
    loadPlaylistOnCompletion:{type: Boolean, default: false},
    resolution:             {type: String,default: '720p'},
    sleep: {
                            enable: {type: Boolean, default: false},
                            ontime: {type: String},
                            offtime: {type: String},
                            ontimeObj: {type: String},
                            offtimeObj: {type: String}
    },
    reboot:                 {
                                enable: {type: Boolean,default: false},
                                time: { type: String}
                            },
    kioskUi:                {
                                enable:     {type: Boolean, default: false},
                                url:        {type: String},
                                timeout:    {type: Number}
                            },
    omxVolume:              {type: Number , default: 100 },
    logo:                   {type: String,default: null},
    logox:                  {type: Number,default: 10},
    logoy:                  {type: Number,default: 10},
    showClock:              {
                                enable: {type: Boolean, default: false},
                                format: {type: String, default: "12"},
                                position: {type: String, default: "bottom"}
                            },
    emergencyMessage:       {
                                enable: false,
                                msg: {type: String, default: ""},
                                hPos: {type: String, default: "middle"},
                                vPos: {type: String, default: "middle"}
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

        if (!criteria.all) {
            criteria.name = {"$not": /__player__/}
        } else {
            delete criteria.all
        }
        this.find(criteria)
            .sort({name: 1}) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(cb)
    }
}

mongoose.model('Group', GroupSchema)

