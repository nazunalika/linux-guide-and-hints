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
        cssmin: {
            target: {
                files: [{
                    expand: true,
                    cwd: 'source/themes/sphinx_theme/static/css',
                    src: ['*.css', '!*.min.css'],
                    dest: 'build/html/_static/css',
                    ext: '.min.css'
                },
                {
                    expand: true,
                    cwd: 'node_modules/prismjs/themes',
                    src: ['prism.css', 'prism-okaidia.css'],
                    dest: 'build/html/_static/css',
                    ext: '.min.css'
                }]
            }
        },
        uglify: {
            target: {
                files: [{
                    cwd: 'source/themes/sphinx_theme/static/js',
                    expand: true,
                    src: ['**/*.js'],
                    dest: 'build/html/_static/js',
                    rename: function (dst, src) {
                        return dst + '/' + src.replace('.js', '.min.js');
                    }
                }, {
                    cwd: 'node_modules/prismjs',
                    expand: true,
                    src: ['prism.js', 'components/prism-bash.js', 'components/prism-docker.js'],
                    dest: 'build/html/_static/js',
                    rename: function (dst, src) {
                        return dst + '/' + src.replace('.js', '.min.js');
                    }
                }]
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
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-imagemin');

    grunt.registerTask('build', ['uglify', 'cssmin', 'imagemin']);
    grunt.registerTask('default', ['build', 'connect']);
};
