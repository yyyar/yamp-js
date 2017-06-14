/**
 * msgpack.js - msgpack serializer
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

var msgpack = require('msgpack5')();

module.exports = {

    type: 'msgpack',

    serialize: (obj) => {
        return msgpack.encode(obj);
    },

    parse: (buf) => {
        return msgpack.decode(buf);
    }
}

