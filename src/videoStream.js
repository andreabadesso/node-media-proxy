(function() {
    'use strict';

    const   ws = require('ws'),
            util = require('util'),
            events = require('events'),
            Mpeg1Muxer = require('./mpeg1muxer'),
            STREAM_MAGIC_BYTES = 'jsmp';

    class VideoStream extends events.EventEmitter {

        constructor(options) {
            super();
            this.name = options.name;
            this.streamUrl = options.streamUrl;
            this.width = options.width;
            this.height = options.height;
            this.wsPort = options.wsPort;
            this.inputStreamStarted = false;
            this.startMpeg1Stream();
            this.pipeStreamToSocketServer();
        }

        closeStream() {
            this.mpeg1Muxer.closeMuxer();
            this.wsServer.close();
        }

        startMpeg1Stream() {

            if (this.inputStreamStarted) {
                return;
            }

            let gettingInputData = false;
            let gettingOutputData = false;
            let inputData = [];
            let outputData = [];

            this.mpeg1Muxer = new Mpeg1Muxer({
                url: this.streamUrl
            });

            this.pid = this.mpeg1Muxer.pid;

            this.mpeg1Muxer.on('mpeg1data', (data) => {
                return this.emit('camdata', data);
            });

            this.mpeg1Muxer.on('ffmpegError', (data) => {
                let size;

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

                        if (this.width == null) {
                            this.width = parseInt(size[0], 10);
                        }
                        if (this.height == null) {
                            return this.height = parseInt(size[1], 10);
                        }

                    }
                }
            });

            this.mpeg1Muxer.on('ffmpegError', (data) => {
                return global.process.stderr.write(data);
            });

        }

        pipeStreamToSocketServer() {
            this.wsServer = new ws.Server({
                port: this.wsPort
            });

            this.wsServer.on('connection', (socket) => {
                return this.onSocketConnect(socket);
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

            return this.on('camdata', (data) => {
                return this.wsServer.broadcast(data);
            });
        }

        onSocketConnect (socket) {
            let streamHeader = new Buffer(8);

            streamHeader.write(STREAM_MAGIC_BYTES);
            streamHeader.writeUInt16BE(this.width, 4);
            streamHeader.writeUInt16BE(this.height, 6);

            socket.send(streamHeader, {
                binary: true
            });

            this.emit('clients', this.wsServer.clients.length);

            console.log(('' + this.name + ': New WebSocket Connection (') + this.wsServer.clients.length + ' total)');

            return socket.on('close', (code, message) => {
                this.emit('clients', this.wsServer.clients.length);

                return console.log(('' + this.name + ': Disconnected WebSocket (') + this.wsServer.clients.length + ' total)');
            });

        }
    }

    module.exports = VideoStream;

}());
