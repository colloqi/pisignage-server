var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var SettingsSchema = new Schema({
    installation: {type: String , default: "local"},
    assetLogEnable: {type: Boolean , default: false},
    newLayoutsEnable: {type: Boolean , default: false},
    defaultDuration: {type: Number, default: 10},
    language: {type: String , default: 'en'},
    logo: {type: String},
    url: {type: String},
    authCredentials: {
        user: {type: String , default: 'pi'},
        password: {type: String , default: 'pi'}
    }
})

mongoose.model('Settings', SettingsSchema)

