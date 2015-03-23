var nedb = require('./nedb'),
    db = {Player:null};

var PlayerSchema = {
    name: String,
    group: {
        _id: {type: Schema.ObjectId, ref: 'Group'},
        name: {type: String, default: 'default'}
    },
    note: String,
    version: String,
    platform_version: String,
    cpuSerialNumber: {type: String, unique: true, index: true},
    myIpAddress: String,
    ip: String,
    location: String,
    playlistOn: Boolean,
    currentPlaylist: String,
    playlistStarttime: String,
    diskSpaceUsed: String,
    diskSpaceAvailable: String,
    lastUpload: {type: Number, default: 0},
    wgetBytes: String,
    wgetSpeed: String,
    syncInProgress: Boolean,
    duration: String,
    tvStatus: Boolean,
    lastReported: {type: Date},
    isConnected: Boolean,
    socket: String,

    registered: {type: Boolean, default: false},

    installation: {type: String, default: 'default'},

    createdAt: {type: Date, default: Date.now},
    createdBy: {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}

nedb.createAndLoad('Player',function(err,data){
    if (err) {

    }
    db.Player = data;
    db.Player.ensureIndex({ fieldName: 'cpuSerialNumber' })
})

module.exports = db.Player;


