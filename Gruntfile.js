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
        copy: {
            quicklink: {
                files: [
                    {expand: true, flatten: true, src: ['node_modules/quicklink/dist/quicklink.umd.js'], dest: 'build/html/_static/js'}
                ]
            }
        },
        uglify: {
            js: {
                cwd: 'source/_static/js',
                expand: true,
                src: ['**/*.js'],
                dest: 'build/html/_static/js',
                rename: function (dst, src) {
                    return dst + '/' + src.replace('.js', '.min.js');
                }
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
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-imagemin');

    grunt.registerTask('build', ['copy', 'uglify', 'imagemin']);
    grunt.registerTask('default', ['build', 'connect']);
};
