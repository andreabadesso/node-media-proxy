(function() {
    'use strict';

    var ws = require('ws');
    var util = require('util');
    var events = require('events');
    var Mpeg1Muxer = require('./mpeg1muxer');
    var STREAM_MAGIC_BYTES = 'jsmp';

    var VideoStream = function(options) {

        this.name = options.name;
        this.streamUrl = options.streamUrl;
        this.width = options.width;
        this.height = options.height;
        this.wsPort = options.wsPort;
        this.inputStreamStarted = false;
        this.startMpeg1Stream();
        this.pipeStreamToSocketServer();

        return this;
    };

    util.inherits(VideoStream, events.EventEmitter);

    VideoStream.prototype.closeStream = function() {
        this.mpeg1Muxer.closeMuxer();
        this.wsServer.close();
    };

    VideoStream.prototype.startMpeg1Stream = function() {

        var self = this;

        var gettingInputData = false;
        var inputData = [];
        var gettingOutputData = false;
        var outputData = [];

        this.mpeg1Muxer = new Mpeg1Muxer({
            url: this.streamUrl
        });

        this.pid = this.mpeg1Muxer.pid;

        if (this.inputStreamStarted) {
            return;
        }

        // Events

        this.mpeg1Muxer.on('mpeg1data', function(data) {
            return self.emit('camdata', data);
        });

        this.mpeg1Muxer.on('ffmpegError', function(data) {
            var size;
            data = data.toString();
            if (data.indexOf('Input #') !== -1) {
                gettingInputData = true;
            }
            if (data.indexOf('Output #') !== -1) {
                gettingInputData = false;
                gettingOutputData = true;
            }
            if (data.indexOf('frame') === 0) {
                gettingOutputData = false;
            }
            if (gettingInputData) {
                inputData.push(data.toString());
                size = data.match(/\d+x\d+/);
                if (size != null) {
                    size = size[0].split('x');

                    if (self.width == null) {
                        self.width = parseInt(size[0], 10);
                    }
                    if (self.height == null) {
                        return self.height = parseInt(size[1], 10);
                    }
                }
            }
        });

        this.mpeg1Muxer.on('ffmpegError', function(data) {
            return global.process.stderr.write(data);
        });

        return this;
    };

    VideoStream.prototype.pipeStreamToSocketServer = function() {
        var self = this;

        this.wsServer = new ws.Server({
            port: this.wsPort
        });

        this.wsServer.on('connection', function(socket) {
            return self.onSocketConnect(socket);
        });

        this.wsServer.broadcast = function(data, opts) {
            var i, _results;
            _results = [];

            for (i in this.clients) {
                if (this.clients[i].readyState === 1) {
                    _results.push(this.clients[i].send(data, opts));
                } else {
                    _results.push(console.log('Error: Client (' + i + ') not connected.'));
                }
            }

            return _results;
        };

        return this.on('camdata', function(data) {
            return self.wsServer.broadcast(data);
        });

    };

    VideoStream.prototype.onSocketConnect = function(socket) {
        var self = this;
        var streamHeader = new Buffer(8);

        streamHeader.write(STREAM_MAGIC_BYTES);
        streamHeader.writeUInt16BE(this.width, 4);
        streamHeader.writeUInt16BE(this.height, 6);

        socket.send(streamHeader, {
            binary: true
        });

        console.log(('' + this.name + ': New WebSocket Connection (') + this.wsServer.clients.length + ' total)');

        return socket.on('close', function(code, message) {
            return console.log(('' + this.name + ': Disconnected WebSocket (') + self.wsServer.clients.length + ' total)');
        });

    };

    module.exports = VideoStream;

}).call(this);
