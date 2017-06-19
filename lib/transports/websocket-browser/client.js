/**
 * client.js - websocket client adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var WebsocketBrowserConnection = require('./connection'),
    YampConnection = require('../../connection');

/**
 * Websocket client implementation for Browser
 */
module.exports = class WebsocketBrowserClient {

    constructor(serializer, opts) {
        this.serializer = serializer;
        this.opts = opts;
    }
 
    connect(callback) {

        let client = this.client = new WebSocket(this.opts.url);

        client.onerror = () => {
            return callback(new Error("Connection to server failed: ", this.opts.url));
        };

        client.onopen = (connection) => {

            client.onerror = null;

            let yampConnection = new YampConnection(new WebsocketBrowserConnection(client), {
                serializer: this.serializer, 
                isClient: true
            });

            yampConnection.once('close', (err) => {
                yampConnection.removeAllListeners();
                callback(err);
            });

            yampConnection.once('ready', () => {
                yampConnection.removeAllListeners('close');
                callback(null, yampConnection);
            });

        };
    }
}


