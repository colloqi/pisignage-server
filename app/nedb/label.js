var nedb = require('./nedb'),
    db = {Label:null};

var LabelSchema = {
    name: {type: String, unique: true, index: true},

    installation: {type: String, default: 'default'},

    createdAt: {type: Date, default: Date.now},
    createdBy: {_id: {type: Schema.ObjectId, ref: 'User'}, name: String}
}

nedb.createAndLoad('Label',function(err,data){
    if (err) {

    }
    db.Label = data;
    db.Label.ensureIndex({ fieldName: 'name' })
})

module.exports = db.Label;


