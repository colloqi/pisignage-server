var nedb = require('./nedb'),
    db = {Asset:null};

var AssetSchema = {

    name: undefined,         //{type: String, index: true},
    type: undefined,
    resolution: {width: String, height: String},
    duration: undefined,
    size: undefined,
    thumbnail: undefined,
    labels: [],
    installation: 'default',

    createdAt: Date.now(),
    createdBy: {_id: undefined, name: undefined}
}

nedb.createAndLoad('Asset',function(err,data){
    if (err) {

    }
    db.Asset = data;
    db.Asset.ensureIndex({ fieldName: 'name' })
})

module.exports = db.Asset;


