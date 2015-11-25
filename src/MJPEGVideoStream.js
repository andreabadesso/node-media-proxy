(function() {
    'use strict';

    const   ws = require('ws'),
            util = require('util'),
            events = require('events'),
            MJPEGMuxer = require('./mjpegmuxer');

    class MJPEGVideoStream extends events.EventEmitter {

        constructor(options) {
            super();
            this.name = options.name;
            this.streamUrl = options.streamUrl;
            this.width = options.width;
            this.height = options.height;
            this.wsPort = options.wsPort;
            this.inputStreamStarted = false;
            this.startMJPEGStream();
            this.pipeStreamToSocketServer();
        }

        closeStream() {
            this.MJPEGStream.closeMuxer();
            this.wsServer.close();
        }

        startMJPEGStream() {
            if (this.inputStreamStarted) {
                return;
            }

            this.MJPEGStream= new MJPEGMuxer({
                url: this.streamUrl
            });

            this.pid = this.MJPEGStream.pid;

            this.MJPEGStream.on('mjpegdata', (data) => {
                return this.emit('camdata', data);
            });

            this.MJPEGStream.on('ffmpegError', (data) => {
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
            this.emit('clients', this.wsServer.clients.length);

            console.log(('' + this.name + ': New WebSocket Connection (') + this.wsServer.clients.length + ' total)');

            return socket.on('close', (code, message) => {
                this.emit('clients', this.wsServer.clients.length);

                return console.log(('' + this.name + ': Disconnected WebSocket (') + this.wsServer.clients.length + ' total)');
            });

        }
    }

    module.exports = MJPEGVideoStream;

}());
