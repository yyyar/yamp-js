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
        this.connToClient.onRequest('add', (ctx, obj, respond) => {
            test.deepEqual([1,2], obj, 'Server got valid request obj');

            this.connToClient.sendRequest('add', obj, (err, response) => {
                respond(err, response);
            });
        });

        // 3. Client handles request and sends it back to server,
        //    and then server will send response to client
        this.connToServer.onRequest('add', (ctx, obj, respond) => {
            test.deepEqual([1,2], obj, 'Client got request obj');
            respond(null, 3);
        });
    },



    /**
     * Request can be cancelled that results to err response to requester
     */
    'request cancel': function(test) {

        const INTERVAL = 200,
              STOP_AFTER = 3;

        let request = this.connToServer.sendRequest('follow', null, (err, response, progress) => {

            if (err) {
                test.equals('the end', err, 'Cancelled error in response');
                test.done();
                return this.connToServer.close();
            }

            if (response == STOP_AFTER) {
                return request.cancel();
            }

            test.equals(true, progress, 'Got progressie response ' + response);
        });

        this.connToClient.onRequest('follow', (ctx, obj, respond) => {

            ctx.i = 0;
            ctx.t = setInterval(() => {
                respond(null, ctx.i++, {progress:true});
            }, INTERVAL);

        }, (ctx, isRollback, done) => {

            test.ok(true, 'Cancel callback called');
            clearInterval(ctx.t);
            done("the end");
        });
    },


     /**
     * Responses can be progressive
     */
    'progressive responses': function(test) {

        const NUM = 3;
        let i = 1;

        let request = this.connToServer.sendRequest('sequence', NUM, (err, response, progress) => {

            if (progress) {
                test.equals(i-1, response, 'progressive response ' + response);
            }

            if (!progress) {
                test.equals('done', response, 'got final response is not progressive');
                this.connToClient.close();
                test.done();
            }

        });

        this.connToClient.onRequest('sequence', (ctx, obj, respond) => {

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

