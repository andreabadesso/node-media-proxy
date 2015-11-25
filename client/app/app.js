(function(window) {
    'use strict';

    function onLoad() {
        var url = window.location.search.replace('?url=', '');
	url = url.split('&url=')[1];
	url = decodeURIComponent(url);

        if (url) {
	    console.log(url);
            var player = new Player({
                streamUrl: url
            });

            player.init();
        }
    }

    window.onLoad = onLoad;
}(window));
