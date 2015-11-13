(function() {
    'use strict';

    const   redbird      = require('redbird'),
            networkUtils = require('../util/network');

    class Proxy {
        constructor(port) {
            this.registeredRoutes = {};
            this.proxy = redbird({
                port: port || 80
            });

            networkUtils.getNetworkIp((error, ip) => {
                if (error) {
                    console.log('error:', error);
                    process.exit(1);
                }

                this.proxy.register(ip + '/get_stream', 'http://localhost:2999/get_stream');
                this.proxy.register(ip, 'http://localhost:2999');

            }, true);
        }

        register(hash, from, to) {
            if (this.registeredRoutes.hasOwnProperty(hash)) {
                this.proxy.unregister(this.registeredRoutes[hash]);
            }
            this.registeredRoutes[hash] = from;
            this.proxy.register(from, to);
        }

        unregister(hash) {
            if (this.registeredRoutes.hasOwnProperty(hash)) {
                this.proxy.unregister(this.registeredRoutes[hash]);
            }
        }
    }

    module.exports = Proxy;
}());
