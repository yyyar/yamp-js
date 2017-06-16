/**
 * server.js - websocket server adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */


var EventEmitter = require('events').EventEmitter,
    TCPTransportConnection = require('./connection'),
    YampConnection = require('../../connection'),
    net = require('net');

/**
 * TCP server adapter
 */
module.exports = class TCPTransportServer extends EventEmitter {

    constructor(serializer, opts) {
        super();

        this.serializer = serializer;
        this.opts = opts;
    }

    /**
     * Start listening for client connection
     */
    serve(callback) {

        this.server = net.createServer();
        this.server.listen(this.opts.port, this.opts.host || '0.0.0.0');

        this.server.on('connection', (socket) => {

            let yampConnection = new YampConnection(new TCPTransportConnection(socket), {serializer: this.serializer, isClient: false});

            yampConnection.once('ready', () => {
                this.emit('connection', yampConnection);
            });
        });

        return this;
    }

    close(callback) {
        this.server.close(callback);
    }
}

