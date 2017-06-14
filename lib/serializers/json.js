/**
 * json.js - json serializer
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

module.exports = {

    type: 'json',

    serialize: (obj) => {
        return new Buffer.from(JSON.stringify(obj));
    },

    parse: (buf) => {
        return JSON.parse(buf);
    }
}

