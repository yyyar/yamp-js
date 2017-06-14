# yamp-js [![Build Status](https://travis-ci.org/yyyar/yamp-js.svg?branch=master)](https://travis-ci.org/yyyar/yamp-js)&nbsp;

yamp-js is implementation of [yamp protocol](https://github.com/yyyar/yamp) in JavaScript.

**Status: under development.** May contain critical bugs, not suitable for production usage.

## Features
* Full Yamp v1.0 draft implementation: handshake, events, res/res, progressive responses, request cancelling.
* Works both in Node.Js and in Browser (websocket).
* Pluggable body serializers. Built-in JSON and MsgPack.
* TCP and Websocket transports.

## Basic Example
Yamp allows bi-directional message transfer between two parties. The following
example covers most simple use case and shows basic events and request/response
handling using websocket transfer and json serialization format.

Node.Js (Server):
```javascript

const Yamp = require('yamp-js');

/* Create server and listen for clients */
let server = Yamp.createServer("websocket", {host: '0.0.0.0', port: 8888}, {type: 'json'}).serve();

server.on('connection', (conn) => {

    console.log('New connection ', conn.remoteAddress);

    conn.on('close', (reason) => {
        console.log('Connection to ' + conn.remoteAddress + ' closed', reason);
    });

    /* handle event */
    conn.onEvent('foo', (obj) => {
        console.log('Got ', obj, 'from client');
    });

    /* handle request */
    conn.onRequest('sum', (a, sendResponse) => {

        if (!Array.isArray(a)) {
            return sendResponse("Error. Not an array");
        }

        let result = a.reduce( (acc, val) => { return acc + val; }, 0);
        sendResponse(null, result);
    });

    /* send request to client */
    conn.sendRequest('mul-on-client', [1,2,3], (err, res) => {
        console.log('Got response: ', err, res);
    });

});

```

Browser JavaScript (Client):
```html

<html>
<head>

    <!-- include yamp bundle -->
    <script src="yamp.bundle.min.js"></script>

    <script>

        Yamp.createClient('websocket-browser', {url: 'ws://localhost:8888'}).connect((err, conn) => {

          if (err) {
              return console.log('Cant open connection: ' +  err);
          }

          conn.on('close', () => {
               console.log('Connection closed');
          })

          /* handle request on client */
          conn.onRequest('mul-on-client', (a, sendResponse) => {

              if (!Array.isArray(a)) {
                  return sendResponse("Error. Not an array");
              }

              let result = a.reduce( (acc, val) => { return acc * val; }, 1);
              sendResponse(null, result);
          });

          /* Send simple event to server */
          conn.sendEvent('foo', {anything:['you', 'want']});

          /* Send request and get response */
          conn.sendRequest('sum', [1,2,3,4,5], function(err, res) {
              console.log("Got response: ", err, res);
          });

        });

    </script>

</head>

<body>
</body>

</html>

```
For more examples see `examples` directory.


## API Documentation
TODO


## License
MIT. See LICENSE file for more details.

## Author
- [Yaroslav Pogrebnyak](http://pogrebnyak.info)

