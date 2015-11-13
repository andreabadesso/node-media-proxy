(function() {
    'use strict';

    const   redbird      = require('redbird'),
            networkUtils = require('../util/network');

    class Proxy {
        constructor(port) {
            this.proxy = redbird({
                port: port || 80
            });

            networkUtils.getNetworkIp((error, ip) => {
                if (error) {
                    console.log('error:', error);
                    process.exit(1);
                }

                this.proxy.register(ip + '/get_stream', 'http://' + ip + ':2999/get_stream');
                this.proxy.register(ip, 'http://localhost:2999');

            }, true);
        }

        register(from, to) {
            this.proxy.register(from, to);
        }

        unregister(url) {
            this.proxy.unregister(url);
        }
    }

    module.exports = Proxy;
}());
