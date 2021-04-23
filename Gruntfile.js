'use strict';

var packageJson = require('./package.json');
var path = require('path');

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nggettext_extract: {
            pot: {
                options: {
                },
                files: {
                    'po/template.pot': [
                        'public/app/js/**/*.js',
                        'public/app/partials/**/*.html',
                        'public/app/templates/*.html'
                    ]
                }
            },
        },
        nggettext_compile: {
            all: {
                options: {
                },
                files: {
                    'public/app/js/translations.js': ['po/*.po']
                }
            },
        },
    });

    grunt.loadNpmTasks('grunt-angular-gettext');

    grunt.registerTask('extract',['nggettext_extract'])
    grunt.registerTask('compile',['nggettext_compile'])
    
};


