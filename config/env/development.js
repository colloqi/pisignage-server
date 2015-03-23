'use strict';

module.exports = {
    env: 'development',
    https: false,
    port: process.env.PORT || 80,
    mongo: {
        uri: 'mongodb://localhost/pisignage-dev'
    }
};