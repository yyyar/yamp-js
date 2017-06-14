/**
 * client.js - websocket client adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var WebsocketBrowserConnection = require('./connection'),
    YampConnection = require('../../connection');

/**
 * Websocket client implementation for
 * Browser
 */
module.exports = class WebsocketBrowserClient {

    /**
     * Creates new instance of WebsocketBrowserClient
     */
    constructor(serializer, opts) {

        this._serializer = serializer;
        this._opts = opts;
    }
 
    /**
     * Initiate connection
     */
    connect(callback) {

        let client = this._client = new WebSocket(this._opts.url);

        client.onerror = () => {
            return callback(new Error("Connection to server failed: ", this._opts.url));
        };

        client.onopen = (connection) => {

            client.onerror = null;

            var yampConnection = new YampConnection(
                new WebSocketBrowserTransportConnection(client), 
                {serializer: this._serializer, isClient: true}
            );

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


