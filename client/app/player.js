(function(window, document) {
    'use strict';

    function Player(body) {
        this.client = null;
        this.player = document.querySelector('.player');
        this.body = body;
    }

    Player.prototype.init = function() {
        this._jsonRequest('/get_stream', this.body, function(data) {
            if (typeof data !== 'object') {
                data = JSON.parse(data);
            }
            this._playVideo(data.proxy);
        }.bind(this));
    };

    // Taken from Underscore.js
    Player.prototype._debounce = function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this,
                args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    Player.prototype._jsonRequest = function(url, body, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        xhr.send(JSON.stringify(body));

        xhr.onloadend = function() {
            callback(xhr.response);
        };
    };

    Player.prototype._generateCss = function(data) {
        var string = 'transparent url(data:image/jpeg;base64,' + data;
        string += ') top left / 100% 100% no-repeat';

        return string;
    };

    Player.prototype._isValidImageUrl = function(url, callback) {
        var image = new Image();
        image.onerror = callback.apply(this, [false]);
        image.onload = callback.apply(this, [null]);

        image.src = url;
    };

    Player.prototype._updateImage = function(image) {
        this._isValidImageUrl('data:image/jpeg;base64,' + image, function(err) {

            if (err) {
                console.log('Invalid image.');
                return;
            }

            /*
             * Updates the div background image to display images if it was a
             * video.
             */
            this.player.style.background = this._generateCss(image);

            /*
             * Debounced call to reconnect to request the stream again
             * every 5 seconds.
             */
            if (!this.checkConnection) {
		console.log('No check connection');
                this.checkConnection = this._debounce(function() {
                    console.log('Retrying connection.');
                    this.init();
                }.bind(this), 5000);

		this.checkConnection();
            } else {
                this.checkConnection();
            }

        }.bind(this));
    };

    Player.prototype._playVideo = function(url) {
        if (this.client && this.client.onmessage) {
            this.client.onmessage = null;
            this.client = null;
        }

        this.client = new WebSocket(url);
        this.client.onmessage = function(res) {
            this._updateImage(res.data);
        }.bind(this);
    };

    window.Player = Player;

}(window, document));
