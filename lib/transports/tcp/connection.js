/**
 * connection.js - tcp connection adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var EventEmitter = require('events').EventEmitter;


/**
 * Websocket transport connection adapter
 */
module.exports = class TCPTransportConnection extends EventEmitter {

    get remoteAddress() {
        return this.socket.remoteAddress;
    }


    constructor(socket, opts) {
        super(opts);

        this.socket = socket;

        socket.on('data', (buf) => {
            this.emit('data', buf);
        });

        socket.on('close', () => {
            this.emit('close', {});
        });

    }

    write(buffer) {
        this.socket.write(buffer);
    }

    close() {
        this.socket.destroy();
    }

}







