'use strict';

var Stream      = require('./src'),
    crypto      = require('crypto'),
    redis       = require('redis'),
    redisClient = redis.createClient();

var minPort = 3000;
var maxPort = 9999;
var activeStreams = [].slice();

/*
 * Generates a hash for an URL
 */
function _generateHash(url) {
    var cryptoUrl = crypto.createHash('md5').update(url).digest("hex");
    return cryptoUrl;
}

/*
 * Recursively finds a port that is not currently in use, returns -1 if all
 * ports in range are being used.
 */
function _getRandomPort(blackList) {
    var port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;

    /* Finding if all ports are on blackList by checking its length
     * TODO: Find a more efficient way to do this
     */
    if (blackList.length >= (maxPort - minPort) + 1) {
        // I don't like this:
        return -1;
    }

    if (blackList.indexOf(port) !== -1) {
        return _getRandomPort(blackList);
    }

    return port;
}

/*
 * Generates an unused random port from minPort to maxPort
 */
function _getVirginPort(cb, usedPorts, port) {
    if (port) {
        return cb(null, port);
    }

    if (!usedPorts) {
        usedPorts = [];
    }

    port = _getRandomPort(usedPorts);

    if (port === -1) {
        return cb(new Error('All ports used'));
    }

    redisClient.get('port:' + port, function(err, data) {
        if (data == null || err) {
            // Port is virgin
            _getVirginPort(cb, usedPorts, port);
        } else {
            usedPorts.push(port);
            _getVirginPort(cb, usedPorts);
        }
    });
}

/*
 * Finds if an stream is already hashed and returns its port
 */
function _findHashStream(hash, cb) {
    redisClient.get('hash:' + hash, function(err, port) {
        if (err != null) {
            return cb(err);
        }

        if (!port) {
            return cb(null, false);
        }

        cb(null, parseInt(port, 10));
    });
}

function _createStream(streamUrl, cb) {
    var hash = _generateHash(streamUrl);

    _findHashStream(hash, function(err, port) {
        if (err) {
            // do something
            return cb(err);
        }

        if (!port) {
            // Create the stream
            _getVirginPort(function(err, port) {
                console.log('err => ', err);
                console.log('port => ', port);
                if (err) {
                    // do something
                    return cb(err);
                }

                if (!port) {
                    // do something too
                    return cb(err);
                }

                console.log('port => ', port);

                // Now we have the port, creating the stream.
                var stream = new Stream({
                    name: hash,
                    streamUrl: streamUrl,
                    wsPort: port
                });

                activeStreams.push(stream);

                // Setting the hash to the port on REDIS
                redisClient.set('hash:' + hash, port, function(err) {
                    cb(err, port);
                });

            });
        } else {
            // Already has the port and is active
            // TODO: Get the process PID number and check if it's alive
            cb(null, port);
        }
    });
}

module.exports = {
};

if (process.env.NODE_ENV === 'test') {
    module.exports._generateHash = _generateHash;
    module.exports._getVirginPort = _getVirginPort;
    module.exports._maxPort = maxPort;
    module.exports._minPort = minPort;
    module.exports._findHashStream = _findHashStream;
    module.exports._createStream = _createStream;

    module.exports._limitPorts = function(min, max) {
        maxPort = max;
        minPort = min;
    };
};
