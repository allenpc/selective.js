module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean: ['<%= pkg.name %>.min.js', 'docs'],

    uglify: {
      options: {
        banner: grunt.file.read('LICENSE.txt')
      },
      dist: {
        files: {
          '<%= pkg.name %>.min.js': ['<%= pkg.main %>']
        }
      }
    },

    docco: {
      src: '<%= pkg.main %>'
    },

    jshint: {
      main: '<%= pkg.main %>'
    }
  });

  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['clean', 'jshint', 'uglify', 'docco']);

};
