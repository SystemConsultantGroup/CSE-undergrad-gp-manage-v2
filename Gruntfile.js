'use strict';

var request = require('request');

module.exports = function(grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    var reloadPort = 35729,
        files;

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        develop: {
            server: {
                file: 'bin/www'
            }
        },
        less: {
            development: {
                options: {
                    paths: ["public/css"]
                },
                files: {
                    "public/css/main.css": "public/css/main.less"
                }
            },
                /*
            production: {
                options: {
                    paths: ["assets/css"],
                    plugins: [
                        new(require('less-plugin-autoprefix'))({
                            browsers: ["last 2 versions"]
                        }),
                        new(require('less-plugin-clean-css'))()
                    ],
                    modifyVars: {
                        imgPath: '"http://mycdn.com/path/to/images"',
                        bgColor: 'red'
                    }
                },
                files: {
                    "path/to/result.css": "path/to/source.less"
                }
            }
                */

        },
        watch: {
            options: {
                nospawn: true,
                livereload: reloadPort
            },
            server: {
                files: [
                    'bin/www',
                    'app.js',
                    'models/*.js',
                    'models/*/*.js',
                    'routes/*.js',
                    'routes/*/*.js',
                    'config/*.json'
                ],
                tasks: ['develop', 'delayed-livereload']
            },
            js: {
                files: ['public/js/*.js'],
                options: {
                    livereload: reloadPort
                }
            },
            css: {
                files: [
                    'public/css/*.less'
                ],
                tasks: ['less'],
                options: {
                    livereload: reloadPort
                }
            },
            views: {
                files: [
                    'views/*.swig',
                    'views/*/*.swig',
                    'views/*/*/*.swig',
                    'views/*/*/*/*.swig',
                ],
                options: {
                    livereload: reloadPort
                }
            }
        }
    });

    grunt.config.requires('watch.server.files');
    files = grunt.config('watch.server.files');
    files = grunt.file.expand(files);


    grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function() {
        var done = this.async();
        setTimeout(function() {
            request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','), function(err, res) {
                var reloaded = !err && res.statusCode === 200;
                if (reloaded) {
                    grunt.log.ok('Delayed live reload successful.');
                } else {
                    grunt.log.error('Unable to make a delayed live reload.');
                }
                done(reloaded);
            });
        }, 500);
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.registerTask('default', [
        'less',
        'develop',
        'watch'
    ]);
};
