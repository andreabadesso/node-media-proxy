'use strict';
(function() {

    $(document).ready(function() {
        var client;
        var QueryString = function() {
            // This function is anonymous, is executed immediately and 
            // the return value is assigned to QueryString!
            var query_string = {};
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                // If first entry with this name
                if (typeof query_string[pair[0]] === "undefined") {
                    query_string[pair[0]] = decodeURIComponent(pair[1]);
                    // If second entry with this name
                } else if (typeof query_string[pair[0]] === "string") {
                    var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
                    query_string[pair[0]] = arr;
                    // If third or later entry with this name
                } else {
                    query_string[pair[0]].push(decodeURIComponent(pair[1]));
                }
            }
            return query_string;
        }();

        function _generateCss(data) {
            var string =
                'transparent url(data:image/jpeg;base64,' +
                data;
            string += ') top left / 100% 100% no-repeat';

            return string;
        }

        function playVideo(url) {
            if (client) {
                client = null;
            }
            client = new WebSocket(url);
            var currentActive = 'video1';
            client.onmessage = function(data) {
                IsValidImageUrl('data:image/jpeg;base64,' +
                    data.data, function(err) {
                        if (err) {
                            return;
                        }

                        try {
                            $('.video').css(
                                'background',
                                _generateCss(data
                                    .data)
                            );
                        } catch (e) {
                            console.log('fail');
                        }
                    });
            };
        }

        if (QueryString.url) {
            $.ajax({
                type: 'POST',
                url: '/get_stream',
                processData: false,
                contentType: 'application/json',
                data: JSON.stringify({
                    "streamUrl": QueryString.url
                }),
                success: function(r) {
                    playVideo(r.proxy);
                }
            });
        }
    });
}());
