'use strict';

var Stream      = require('./src'),
    crypto      = require('crypto'),
    redis       = require('redis'),
    async       = require('async'),
    redisClient = redis.createClient(),
    express     = require('express'),
    app         = express(),
    bodyParser  = require('body-parser');

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

function _createStream(hash, port, url, cb) {

    var stream = new Stream({
        name: hash,
        streamUrl: url,
        wsPort: port
    });

    // Should register the stream PID on redis

    redisClient.set('port:' + port + ':pid', stream.pid, function(err) {
        return cb(err, stream);
    });
}

function _checkPid(pid) {
    try {
        return process.kill(pid, 0);
    }
    catch(e) {
        return e.code === 'EPERM';
    }
}

function _clearStream(port, cb) {
    // Getting the stored hash:
    redisClient.get('port:' + port, function(err, hash) {
        if (err) {
            return cb(err);
        }

        async.parallel([
            // Killing the port:
            function(callback) {
                redisClient.del('port:' + port, function(err) {
                    callback(err);
                });
            },
            // Killing the pid:
            function(callback) {
                redisClient.del('port:' + port + ':pid', function(err) {
                    callback(err);
                });
            },
            // Killing the hash:
            function(callback) {
                redisClient.del('hash:' + hash, function(err) {
                    callback(err);
                });
            }
        ], function(err) {
            cb(err);
        });

    });
}

function stream(streamUrl, cb) {
    var hash = _generateHash(streamUrl);

    _findHashStream(hash, function(err, port) {
        if (err) {
            // do something
            return cb(err);
        }

        if (!port) {
            // Create the stream
            _getVirginPort(function(err, port) {
                if (err) {
                    // do something
                    return cb(err);
                }

                if (!port) {
                    // do something too
                    return cb(new Error('No ports are available'));
                }

                var stream = _createStream(hash, port, streamUrl, function(err, stream) {
                    activeStreams.push(stream);

                    // Setting the hash to the port on REDIS
                    redisClient.set('hash:' + hash, port, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        // Setting the port to the hash on REDIS
                        redisClient.set('port:' + port, hash, function(err) {
                            cb(err, port);
                        });
                    });
                });
            });

        } else {
            // Already has the port and is active
            redisClient.get('port:' + port + ':pid', function(err, pid) {
                var isAlive = _checkPid(pid);

                if (!isAlive) {

                    // Clearing the stream from REDIS and trying to create it
                    // again
                    _clearStream(port, function(err) {
                        if (err) {
                            return cb(err);
                        }

                        // Trying again
                        return stream(streamUrl, cb);
                    });

                } else {
                    cb(null, port);
                }
            });
        }
    });
}

app.use(bodyParser.json());
app.post('/get_stream', function(req, res) {
    var url = req.body.streamUrl;

    stream(url, function(err, port) {
        res.send({
            port: port
        });
    });
});

app.listen(2999);


if (process.env.NODE_ENV === 'test') {
    module.exports._generateHash = _generateHash;
    module.exports._getVirginPort = _getVirginPort;
    module.exports._maxPort = maxPort;
    module.exports._minPort = minPort;
    module.exports._findHashStream = _findHashStream;
    module.exports._createStream = _createStream;
    module.exports.stream = stream;
    module.exports._limitPorts = function(min, max) {
        maxPort = max;
        minPort = min;
    };
};
