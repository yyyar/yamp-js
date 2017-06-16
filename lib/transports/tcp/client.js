/**
 * client.js - tcp client adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

const YampConnection = require('../../connection'),
      TCPTransportConnection = require('./connection'),
      net = require('net');

/**
 * TCP transport client adapter
 */
module.exports = class TCPTransportClient {

    constructor(serializer, opts) {

        this.serializer = serializer;
        this.opts = opts;

        this.socket = new net.Socket();
    }

    connect(callback) {

        this.socket.once('error', () => {
            callback(err || new Error('Server has dropped connection'));
        });

        this.socket.connect(this.opts.port, this.opts.host, () => {

            this.socket.removeAllListeners('error');

            let yampConnection = new YampConnection(new TCPTransportConnection(this.socket), {
               serializer: this.serializer,
               isClient: true
            });

            yampConnection.once('ready', () => {
                yampConnection.removeAllListeners('close');
                callback(null, yampConnection);
            });

        });
    }
}


