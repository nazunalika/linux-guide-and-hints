module.exports = function(grunt) {
    
    grunt.initConfig({
        connect: {
            server: {
                options: {
                    livereload: true,
                    keepalive: true,
                    base: 'build/html',
                    protocol: 'https',
                    port: 8443,
                    key: grunt.file.read('cert/server.key').toString(),
                    cert: grunt.file.read('cert/server.crt').toString(),
                    ca: grunt.file.read('cert/ca.crt').toString()
                }
            }
        },
        uglify: {
            js: {
                src: ['source/_static/js/prism.js'],
                dest: 'build/html/_static/js/prism.min.js'
            }
        },
        imagemin: {
            dynamic: {
                files: [{
                    cwd: 'source/_static/img/',
                    expand: true,
                    src: ['**/*.{png,jpg}'],
                    dest: 'build/html/_static/img/'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-imagemin');

    grunt.registerTask('default', ['connect']);
};
