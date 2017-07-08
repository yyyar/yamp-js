/**
 * server.js - websocket server adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */


var _ = require('lodash'),
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    WebSocketServer = require('websocket').server,
    WebSocketTransportConnection = require('./connection'),
    YampConnection = require('../../connection');

/**
 * Websocket server adapter
 */
module.exports = class WebSocketTransportServer extends EventEmitter {

    /**
     * Creates new instance of WebSocketTransportServer
     */
    constructor(serializer, opts) {
        super();

        this._serializer = serializer;
        this._opts = opts;
    }

    /**
     * Start listening for client connection
     */
    serve(callback) {

        this._server = http.createServer();
        this._server.listen(this._opts.port, this._opts.host || '0.0.0.0');

        this._wsServer = new WebSocketServer(_.merge({
            httpServer: this._server,
            autoAcceptConnections: true,
        }, this._opts.serverConfig));

        this._wsServer.on('connect', (connection) => {
            var yampConnection = new YampConnection(new WebSocketTransportConnection(connection), {serializer: this._serializer, isClient: false});
            yampConnection.once('ready', () => {
                this.emit('connection', yampConnection);
            });
        });

        return this;
    }

    /**
     * Close server: stop listening for new connections
     */
    close(callback) {
        this._server.close(callback);
    }
}

