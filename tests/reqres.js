/**
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */
const _ = require('lodash'),
      Yamp = require('../lib');


const PORT = 8888;

module.exports = {

    
    setUp: async function(callback) {

        let self = this;

        /* ---------- Server ---------- */

        let serverReady = new Promise((resolve) => {

            this.server = Yamp.createServer('websocket', { port: PORT }).serve();

            this.server.on('connection', (conn) => {
                self.connToClient = conn;
                resolve();
            });
        });


        /* ---------- Client ---------- */

        let clientReady = new Promise((resolve) => {
            var client = Yamp.createClient('websocket', {url: `ws://localhost:${PORT}`});

            client.connect((err, conn) => {
                self.connToServer = conn;
                resolve();
            });
        });

        await Promise.all([serverReady, clientReady]);

        callback();
    },


    tearDown: function(callback) {

        this.connToClient.close();
        this.connToServer.close();
        this.server.close();

        callback();
    },

    /**
     * Check req-res works in both directions, i.e.
     * requests can be send from client to server, and from
     * server to client, and it works
     */
    'request-response works in both sides': function(test) {

        // 1. Send request to server
        this.connToServer.sendRequest('add', [1,2], (err, response) => {
            test.equals(null, err, 'No error in response');
            test.equals(3, response, 'Valid response value');
            test.done();
            this.connToServer.close();
        });


        // 2. Server handles request and sends the same request to client
        this.connToClient.onRequest('add', (obj, respond) => {
            test.deepEqual([1,2], obj, 'Server got valid request obj');

            this.connToClient.sendRequest('add', obj, (err, response) => {
                respond(err, response);
            });
        });

        // 3. Client handles request and sends it back to server,
        //    and then server will send response to client
        this.connToServer.onRequest('add', (obj, respond) => {
            test.deepEqual([1,2], obj, 'Client got request obj');
            respond(null, 3);
        });
    },



    /**
     * Request can be cancelled that results to err response to requester
     */
    'request cancel': function(test) {

        let request = this.connToServer.sendRequest('add', [1,2], (err, response) => {
            test.equals('cancelled', err, 'Cancelled error in response');
            test.equals(null, response, 'No response value');
            test.done();
            this.connToServer.close();
        });

        request.cancel();

        var t = null;

        this.connToClient.onRequest('add', (obj, respond) => {

            test.deepEqual([1,2], obj, 'Got valid request body in request handler');

            t = setTimeout(() => {
                respond(null, 3);
            }, 1000);

        }, (graceful, done) => {

            test.ok(true, 'Cancel callback called');
            clearTimeout(t);

            if (graceful) {
                done();
            }
        });
    },


     /**
     * Request can be progressive
     */
    'progressive requests': function(test) {

        const NUM = 3;
        let i = 1;

        let request = this.connToServer.sendRequest('sequence', NUM, {progressive: true}, (err, response, progress) => {

            if (progress) {
                test.equals(i-1, response, 'progressive response ' + response);
            }

            if (!progress) {
                test.equals('done', response, 'got final response is not progressive');
                this.connToClient.close();
                test.done();
            }

        });

        this.connToClient.onRequest('sequence', (obj, respond) => {

            var interval = setInterval(() => {
                if (i > obj) {
                    clearInterval(interval);
                    return respond(null, 'done');
                }
                respond(null, i++, {progress: true});

            }, 200);

        });
    },





}


