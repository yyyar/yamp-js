/**
 * connection.js - websocket connection adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var EventEmitter = require('events').EventEmitter;


/**
 * Websocket transport connection adapter
 */
module.exports = class WebSocketTransportConnection extends EventEmitter {


    /**
     * Returns another party ip address
     */
    get remoteAddress() {
        return this._connection.remoteAddress;
    }

    /**
     * Creates new instance of WebSocketTransportConnection
     */
    constructor(connection, opts) {
        super(opts);

        this._connection = connection;

        /**
         * Emit binary message data
         */
        connection.on('message', (msg) => {
            this.emit('data', msg.binaryData);
        });

        /**
         * Emit close
         */
        connection.on('close', () => {
            this.emit('close', {});
        });

    }

    /**
     * Send buffer via connection
     */
    write(buffer) {
        this._connection.sendBytes(buffer);
    }

    /**
     * Close connection
     */
    close() {
        this._connection.close();
    }

}







