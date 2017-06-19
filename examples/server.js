const Yamp = require('../lib');

let server = Yamp.createServer('websocket', { host:'localhost', port: 8888 }).serve();

server.on('connection', (conn) => {

    console.log('Got new connection');

    conn.onRequest('mul', (e, respond) => {

        if (typeof(e) != 'number') {
            return respond("Bad format");
        }
        console.log('got request: ', e);
        respond(null, e*2);
    });

});

