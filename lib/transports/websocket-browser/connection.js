/**
 * connection.js - websocket connection adapter
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var EventEmitter = require('events').EventEmitter;


/**
 * Websocket connection adapter for Browser
 */
module.exports = class WebsocketBrowserConnection extends EventEmitter {


    /**
     * Returns another party ip address
     */
    get remoteAddress() {
        return null;
    }

    /**
     * Creates new instance of WebSocketTransportConnection
     */
    constructor(connection, opts) {
        super(opts);

        this._connection = connection;

        let inProgress = 0;
        let needClose = false;

        /**
         * Emit binary message data
         */
        connection.onmessage = (msg) => {
            var self = this;

            inProgress++;

            var fileReader = new FileReader();
            fileReader.onload = function() {

                self.emit('data', this.result);

                if (needClose && --inProgress == 0 ) {
                    self.emit('close', {});
                }
            };

            fileReader.readAsArrayBuffer(msg.data);
        };

        /**
         * Emit close
         */
        connection.onclose = () => {

            if (inProgress !== 0) {
                needClose = true;
                return
            }

            this.emit('close', {});
        };

    }

    /**
     * Send buffer via connection
     */
    write(buffer) {
        this._connection.send(buffer);
    }

    /**
     * Close connection
     */
    close() {
        this._connection.close();
    }

}







