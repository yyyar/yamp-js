/**
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

const _ = require('lodash'),
      Yamp = require('../lib');


const PORT = 8888;

module.exports = {


    'Client and server just work': (test) => {

        /* ---------- Server ---------- */

        var server = Yamp.createServer('tcp', { host:'localhost', port: PORT }).serve();

        server.on('connection', (conn) => {

            test.notEqual(conn, null, 'Server accepted client');
            test.equals(conn.remoteAddress, '127.0.0.1', 'Client remote address property exists');

            conn.onEvent('hello', (obj) => {
                test.deepEqual(obj, {hello:'world'}, 'Server got event that client sent');

                server.close();
                conn.close();

                test.done();
            });

        });


        /* ---------- Client ---------- */

        var client = Yamp.createClient('tcp', {host: 'localhost', port: PORT});

        client.connect((err, conn) => {

            test.equal(err, null, 'Client connected to server');
            test.equals(conn.remoteAddress, '127.0.0.1', 'Serverremote address property exists');

            conn.sendEvent('hello', {hello:'world'});

        });
    },

    'Client sends close and server can handle it': (test) => {

        /* ---------- Server ---------- */

        var server = Yamp.createServer('websocket', { port: PORT, serverConfig: {
            maxReceivedFrameSize: 1000000,
            maxReceivedMessageSize:1000000
        }}).serve();

        server.on('connection', (conn) => {

            test.notEqual(conn, null, 'Server accepted client');

            conn.on('close', (reason) => {
                test.equal(reason, 'goodbye', 'Server handled close with reason');
                server.close();
                test.done();
            });
        });


        /* ---------- Client ---------- */

        var client = Yamp.createClient('websocket', {url: `ws://localhost:${PORT}`});

        client.connect((err, conn) => {

            test.notEqual(conn, null, 'Client connected to server');

            conn.on('close', (reason) => {
                test.equal(reason, null, 'Client got close event with no reason');
            });

            conn.close('goodbye');
        });
    },


    'Server sends close and client can handle it': (test) => {

        /* ---------- Server ---------- */

        var server = Yamp.createServer('websocket', { port: PORT }).serve();

        server.on('connection', (conn) => {

            test.notEqual(conn, null, 'Server accepted client');

            setImmediate(() => {
                conn.close('goodbye');
            }, 0);

        });


        /* ---------- Client ---------- */

        var client = Yamp.createClient('websocket', {url: `ws://localhost:${PORT}`});

        client.connect((err, conn) => {

            conn.on('close', (reason) => {
                test.equal(reason, 'goodbye', 'Server handled close with reason');
                server.close()
                test.done();
            });

        });
    },
}


