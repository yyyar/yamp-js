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

    get remoteAddress() {
        return null;
    }

    constructor(connection, opts) {
        super(opts);

        this.connection = connection;

        let inProgress = 0;
        let needClose = false;

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

 
        connection.onclose = () => {

            if (inProgress !== 0) {
                needClose = true;
                return
            }

            this.emit('close', {});
        };

    }

    write(buffer) {
        this.connection.send(buffer);
    }

    close() {
        this.connection.close();
    }

}







