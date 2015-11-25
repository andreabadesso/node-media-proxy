(function(window) {
    'use strict';

    function onLoad() {
        var url = window.location.search.replace('?url=', '');
        if (url) {
            var player = new Player({
                streamUrl: url
            });

            player.init();
        }
    }

    window.onLoad = onLoad;
}(window));
