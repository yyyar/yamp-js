const Yamp = require('../lib');

let server = Yamp.createServer('websocket', { port: 8888 }).serve();

server.on('connection', (conn) => {

    console.log('Got new connection');

    conn.onRequest('mul', (e, respond) => {
        console.log('got request: ', e);
        respond(null, e*2);
    });

});

