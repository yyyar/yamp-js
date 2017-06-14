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

    'event from server to client works': function(test) {

        this.connToServer.onEvent('string', (obj) => {
            test.equals('hello', obj, 'client got number event');
        });

        this.connToServer.onEvent('number', (obj) => {
            test.equals(42, obj, 'client got number event');
        });

        this.connToServer.onEvent('object', (obj) => {
            test.deepEqual({mega:{object:[1,2,3]}}, obj, 'client got object event');
        });

        this.connToServer.on('close', (reason) => {
            test.done();
        });

        this.connToClient.sendEvent('string', 'hello');
        this.connToClient.sendEvent('number', 42);
        this.connToClient.sendEvent('object', {mega:{object:[1,2,3]}} );

        setTimeout(() => {
            this.connToClient.close();
        }, 1000);
    },


    'event from client to server works': function(test) {

        this.connToClient.onEvent('string', (obj) => {
            test.equals('hello', obj, 'server got number event');
        });

        this.connToClient.onEvent('number', (obj) => {
            test.equals(42, obj, 'server got number event');
        });

        this.connToClient.onEvent('object', (obj) => {
            test.deepEqual({mega:{object:[1,2,3]}}, obj, 'server got object event');
        });

        this.connToClient.on('close', (reason) => {
            test.done();
        });

        this.connToServer.sendEvent('string', 'hello');
        this.connToServer.sendEvent('number', 42);
        this.connToServer.sendEvent('object', {mega:{object:[1,2,3]}} );

        setTimeout(() => {
            this.connToClient.close();
        }, 1000);
    },


    'event works in both directions': function(test) {

        this.connToClient.onEvent('one', (obj) => {
            test.equals('one', obj, 'server got number event');
        });


        this.connToServer.onEvent('two', (obj) => {
            test.equals('two', obj, 'client got number event');
        });


        this.connToClient.on('close', (reason) => {
            test.done();
        });

        this.connToClient.sendEvent('one', 'one');
        this.connToServer.sendEvent('two', 'two');
        this.connToClient.sendEvent('one', 'one');
        this.connToServer.sendEvent('two', 'two');

        setTimeout(() => {
            this.connToClient.close();
        }, 1000);
    },

}


