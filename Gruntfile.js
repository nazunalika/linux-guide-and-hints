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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['connect']);
};
