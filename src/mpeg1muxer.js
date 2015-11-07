(function() {
    'use strict';

    var childProcess = require('child_process'),
        util = require('util'),
        events = require('events');

    var Mpeg1Muxer = function(options) {
        var self = this;

        this.url = options.url;

        this.closeMuxer = function() {
            if (this.stream != null) {
                this.stream.kill('SIGINT');
            }
        };

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
            return self.emit('mpeg1data', data);
        });

        this.stream.stderr.on('data', function(data) {
            return self.emit('ffmpegError', data);
        });

        return this;
    };

    util.inherits(Mpeg1Muxer, events.EventEmitter);

    module.exports = Mpeg1Muxer;

}).call(this);

