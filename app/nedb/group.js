var nedb = require('./nedb'),
    db = {Group:null};

var GroupSchema = {
    name: undefined,
    description: undefined,

    playlists: [],
    assets: [],
    folderSecret: undefined,
    folderSecretReadWrite: undefined,
    lastDeployed: undefined,

    orientation: {type: String, default: 'landscape'},
    resolution: {type: String, default: '720p'},
    createdAt: {type: Date, default: Date.now},
    createdBy: {_id: undefined, name: undefined}
}


nedb.createAndLoad('Group',function(err,data){
    if (err) {

    }
    db.Group = data;
    db.Group.ensureIndex({ fieldName: 'name' })
})

module.exports = db.Group;


