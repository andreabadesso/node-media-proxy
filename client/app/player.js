'use strict';
(function() {

    $(document).ready(function() {
        var client;

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

        var url = window.location.search.replace('?url=', '');
        if (url) {
            $.ajax({
                type: 'POST',
                url: '/get_stream',
                processData: false,
                contentType: 'application/json',
                data: JSON.stringify({
                    "streamUrl": url
                }),
                success: function(r) {
                    playVideo(r.proxy);
                }
            });
        }
    });
}());
