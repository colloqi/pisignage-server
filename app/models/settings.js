var mongoose = require('mongoose'),
    Schema = mongoose.Schema

var SettingsSchema = new Schema({
    installation: {type: String , default: "local"},
    assetLogEnable: {type: Boolean , default: false},
    newLayoutsEnable: {type: Boolean , default: false},
    language: {type: String , default: 'en'},
    authCredentials: {
        user: {type: String , default: 'pi'},
        password: {type: String , default: 'pi'}
    }
})

mongoose.model('Settings', SettingsSchema)

