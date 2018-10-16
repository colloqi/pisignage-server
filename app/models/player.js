var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var PlayerSchema = new Schema({
    name:                   String,
    group:                  {_id: {type: Schema.ObjectId, ref: 'Group', index: true},
                                        name: {type: String, default: 'default'}},
    selfGroupId:            String,
    note:                   String,
    TZ:                     String,
    version:                String,
    platform_version:       String,
    cpuSerialNumber:        {type: String,unique: true, index: true},
    myIpAddress:            String,
    ip:                     String,
    location:               String,
    configLocation:         String,
    playlistOn:             Boolean,
    currentPlaylist:        String,
    playlistStarttime:      String,
    diskSpaceUsed:          String,
    diskSpaceAvailable:     String,
    lastUpload:             {type: Number, default: 0},
    localName:              String,
    wgetBytes:              String,
    wgetSpeed:              String,
    syncInProgress:         Boolean,
    duration:               String,
    tvStatus:               Boolean,
    lastReported:           {type: Date},
    isConnected:            {type: Boolean,index: true},
    socket:                 {type: String,index: true},
    newSocketIo:            {type: Boolean,default:false},

    registered:             {type: Boolean, default: false},
    serverServiceDisabled:  {type: Boolean, default: false},

    labels:                 [],

    createdAt:              {type: Date, default: Date.now},
    createdBy:              {_id: {type: Schema.ObjectId, ref: 'User'}, name: String},
    licensed:               {type: Boolean, default: false},
    ethMac:                 String,
    wifiMac:                String,
    cecTvStatus:            {type: Boolean, default : true},
    piTemperature:          {type: String}
})



PlayerSchema.path('cpuSerialNumber').validate(function (name) {
    return name.length > 0
}, 'cpuSerialNumber cannot be blank')

PlayerSchema.statics = {
   load: function (id, cb) {
        this.findOne({ _id: id })
            .exec(cb)
    },

    list: function (options, cb) {
        var criteria = options.criteria || {}

        this.find(criteria)
            .sort({name: -1}) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(cb)
    }
}

mongoose.model('Player', PlayerSchema)

