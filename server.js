'use strict';

var Stream = require('./src');

var streams = {
    'genetec01': new Stream({
        name: 'StreaName',
        streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
        wsPort: 9999
    })
};

setInterval(function() {
    streams.genetec01.closeStream();
    delete streams.genetec01;

    setTimeout(function() {
        streams['genetec01'] = new Stream({
            name: 'StreaName',
            streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
            wsPort: 9999
        });
    }, 3000);

}, 15000);
