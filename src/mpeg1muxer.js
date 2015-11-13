(function() {
    'use strict';

    const   childProcess = require('child_process'),
            util         = require('util'),
            events       = require('events');

    class Mpeg1Muxer extends events.EventEmitter {

        constructor(options) {
            super();
            this.url = options.url;
            this.stream = childProcess.spawn('ffmpeg', [
                '-rtsp_transport',
                'tcp',
                '-i',
                this.url,
                '-f',
                'mpeg1video',
                '-b:v',
                '800k',
                '-r',
                '30',
                '-'
            ], {
                detached: false
            });
            this.pid = this.stream.pid;
            this.inputStreamStarted = true;
            this.stream.stdout.on('data', function(data) {
                return this.emit('mpeg1data', data);
            }.bind(this));

            this.stream.stderr.on('data', function(data) {
                return this.emit('ffmpegError', data);
            }.bind(this));
        }

        closeMuxer() {
            if (this.stream != null) {
                this.stream.kill('SIGINT');
            }
        }
    };

    module.exports = Mpeg1Muxer;
}());
