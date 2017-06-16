/**
 * transports.js - transports registry
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */


module.exports = {

    'tcp': {
        'server': require('./tcp/server'),
        'client': require('./tcp/client')
    },

    'websocket': {
        'server': require('./websocket/server'),
        'client': require('./websocket/client')
    },

    'websocket-browser': {
        'client': require('./websocket-browser/client')
    }

}

