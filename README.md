# Node Media Proxy

The idea is to efficiently stream common video formats via WebSockets.

The server will receive the RTSP feed URL via a HTTP POST request and check if it's already streaming.

If it is, it will answer the request with the corresponding port and persist a md5 hash representing this URL on REDIS.

If it's not, it will start a WS server on a random port, convert the RTSP stream to MPEG1 using ffmpeg and start sending the frames on it.

### The Stack:

* Node.JS
* Redis
* FFMPEG

### Roadmap

* Streaming most common formats (RTSP, RTMP)
* Gateway to proxy ports from port 80
* Auto scaling
* Monitoring API
