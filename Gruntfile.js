'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' All rights reserved. */' +
      'require(\'source-map-support\').install();',
    // Task configuration.
    usebanner: {
      dist: {
        options: {
          position: 'bottom',
          banner: '<%= banner %>'
        },
        files: {
          src: [ 'testdriver/**/*.js', 'packager/**/*.js', 'bin/**/*.js','tasks/**/*.js', 'Deployer.js' ]
        }
      }
    },
    coffee: {
      glob_to_multiple: {
        options: {
          sourceMap: true
        },
        expand: true,
        flatten: false,
        src: ['testdriver/**/*.coffee', 'packager/**/*.coffee', 'bin/**/*.coffee',
          'tasks/**/*.coffee', "Deployer.coffee"],
        ext: '.js'
      }
    },
    coffeelint: {
      dist: {
        options: grunt.file.readJSON('coffeelint.json'),
        files: {
          src: [ 'testdriver/**/*.coffee', 'packager/**/*.coffee', 'bin/**/*.coffee',
            'tasks/**/*.coffee', "Deployer.coffee" ]
        }
      }
    },
    watch: {
      scripts: {
        files: [ "**/*.coffee" ],
        tasks: ['default']
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-banner');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task.
  grunt.registerTask('default', [ 'coffeelint', 'coffee', 'usebanner']);

};
