'use strict';

module.exports = {
    env: 'production',
    https: true,
    port: process.env.PORT || 443,
    mongo: {
        uri: process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://127.0.0.1:27017/pisignage-server',
        /*
        options: {
            //useMongoClient: true , //deprecated in Mongoose 5.x
        }  
        */
    }
};