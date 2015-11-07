process.env.NODE_ENV = 'test';

var mocha = require('mocha'),
    assert = require('assert'),
    server = require('../server'),
    chai = require('chai'),
    async = require('async'),
    redis = require('redis'),
    redisClient = redis.createClient(),
    Stream = require('../src');

var expect = chai.expect;

describe('Server', function() {

    describe('cryptedUrl', function() {

        beforeEach(function(done) {
            var minPort = 3000;
            var maxPort = 9999;

            server._limitPorts(minPort, maxPort);
            done();
        });

        it('The same URL should have the same crypt', function() {
            var hash1 = server._generateHash('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov');
            var hash2 = server._generateHash('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov');

            expect(hash1).to.equal(hash2);
        });

        it('Different URLs should not have the same crypt', function() {
            var hash1 = server._generateHash('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov');
            var hash2 = server._generateHash('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_112k.mov');

            expect(hash1).to.not.equal(hash2);
        });

        it('Should find an empty port from redis', function(done) {
            server._getVirginPort(function(err, port) {
                expect(err).to.be.null;
                expect(parseInt(port, 10)).to.be.below(server._maxPort);
                expect(parseInt(port, 10)).to.be.above(server._minPort);
                done();
            });
        });

        it('Should find the last open port', function(done) {
            // Limiting ports to a range out of the regular range
            server._limitPorts(2001, 2002);
            redisClient.set('port:2001', 'melocotones', function(err) {
                if (err) {
                    done(err);
                }
                server._getVirginPort(function(err, port) {
                    expect(err).to.be.null;
                    expect(parseInt(port, 10)).to.equal(2002);
                    done();
                });
            });
        });

        it('Should find the last open port', function(done) {
            // Limiting ports to a range out of the regular range
            server._limitPorts(2001, 2002);
            redisClient.set('port:2001', 'melocotones', function(err) {
                if (err) {
                    done(err);
                }
                server._getVirginPort(function(err, port) {
                    expect(err).to.be.null;
                    expect(parseInt(port, 10)).to.equal(2002);
                    done();
                });
            });
        });

        it('Should return an error when there are no empty ports', function(done) {
            // Limiting ports to a range out of the regular range
            server._limitPorts(2001, 2001);
            // Using the only port available (2001)
            redisClient.set('port:2001', 'melocotones', function(err) {
                server._getVirginPort(function(err, port) {
                    expect(err).not.to.be.null;
                    done();
                });
            });
        });

        it('Should find a port from the url hash', function(done) {
            redisClient.set('hash:melocotones', 8127, function(err) {
                server._findHashStream('melocotones', function(err, port) {
                    expect(err).to.be.null;
                    expect(port).to.be.equal(8127);
                    done();
                });
            });
        });

        it('Should not find a port from the url hash', function(done) {
            server._findHashStream('randomshit', function(err, port) {
                expect(err).to.be.null;
                expect(port).to.be.false;
                done();
            });
        });

        it('Port should be an integer', function(done) {
            redisClient.set('hash:melocotones', 8127, function(err) {
                server._findHashStream('melocotones', function(err, port) {
                    expect(err).to.be.null;
                    expect(port).not.to.be.equal('8127');
                    done();
                });
            });
        });

        it('Should create an stream object on a random unused port', function(done) {
            server.stream('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov', function(err, port) {
                expect(err).to.be.null;
                expect(port).to.be.a('number');
                done();
            });
        });

        it('Should get the stream port if it\'s already opened', function(done) {
            server._limitPorts(2010, 2010);

            var hash = server._generateHash('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov');

            redisClient.del('hash:' + hash, function(err) {
                expect(err).to.be.null;
                redisClient.del('port:' + 2010, function(err) {
                    expect(err).to.be.null;
                    server.stream('rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov', function(err, port) {
                        expect(port).to.equal(2010);
                        done();
                    });
                });
            });
        });

    });
});
