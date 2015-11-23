(function() {
    'use strict';

    const   childProcess = require('child_process'),
            util         = require('util'),
            events       = require('events');

    class MJPEGMuxer extends events.EventEmitter {

        constructor(options) {
            super();
            this.url = options.url;

            this.stream = childProcess.spawn('ffmpeg', [
                '-rtsp_transport',
                'tcp',
                '-i',
                this.url,
                '-f',
                'mjpeg',
		'-q:v',
		'3',
                '-r',
                '30',
		'-deinterlace',
                '-'
            ], {
                detached: false
            });

            this.pid = this.stream.pid;
            this.inputStreamStarted = true;
            this.stream.stdout.on('data', (data) => {
                let frame = new Buffer(data).toString('base64');
                return this.emit('mjpegdata', frame);
            });
            this.stream.stderr.on('data', (data) => {
                return this.emit('mjpegerror', data);
            });
        }

        closeMuxer() {
            if (this.stream != null) {
                this.stream.kill('SIGINT');
            }
        }
    };

    module.exports = MJPEGMuxer;
}());
