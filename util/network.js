(function() {
    'use strict';

    module.exports.getNetworkIp = function(callback, bypassCache) {
        const ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;
        const exec = require('child_process').exec;

        let cached;
        let command;
        let filterRE;

        switch (process.platform) {
            case 'darwin':
                command = 'ifconfig';
                filterRE = /\binet\s+([^\s]+)/g;
                break;
            default:
                command = 'ifconfig';
                filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
                break;
        }

        // get cached value
        if (cached && !bypassCache) {
            callback(null, cached);
            return;
        }
        // system call
        exec(command, function(error, stdout, sterr) {
            var ips = [];
            // extract IPs
            var matches = stdout.match(filterRE);
            // JS has no lookbehind REs, so we need a trick
            for (var i = 0; i < matches.length; i++) {
                ips.push(matches[i].replace(filterRE, '$1'));
            }

            // filter BS
            for (var i = 0, l = ips.length; i < l; i++) {
                if (!ignoreRE.test(ips[i])) {
                    //if (!error) {
                    cached = ips[i];
                    //}
                    callback(error, ips[i]);
                    return;
                }
            }
            // nothing found
            callback(error, null);
        });
    }

})();
