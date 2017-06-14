/**
 * client.js - websocket client adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var WebSocketClient = require('websocket').client,
    WebSocketTransportConnection = require('./connection'),
    YampConnection = require('../../connection');

/**
 * Websocket transport client adapter
 */
module.exports = class WebSocketTransportClient {

    /**
     * Creates new instance of WebSocketTransportClient
     */
    constructor(serializer, opts) {

        this._serializer = serializer;
        this._opts = opts;

        this._client = new WebSocketClient();
    }

    /**
     * Initiate connection
     */
    connect(callback) {

        this._client.connect(this._opts.url);

        this._client.on('connectFailed', (err) => {
            this._client.removeAllListeners();
            callback(err);
        });

        this._client.on('connect', (connection) => {

            var yampConnection = new YampConnection(
                new WebSocketTransportConnection(connection), 
                {serializer: this._serializer, isClient: true}
            );

            yampConnection.once('close', (err) => {
                yampConnection.removeAllListeners();
                callback(err || new Error('Server has dropped connection'));
            });

            yampConnection.once('ready', () => {
                yampConnection.removeAllListeners('close');
                callback(null, yampConnection);
            });

        });
    }
}


