/**
 * yamp.js
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

const _ = require('lodash'),
      transports = require('./transports'),
      serializers = require('./serializers');

/**
 * Yamp facade
 */
var Yamp = module.exports = {


    /**
     * List available transports
     */
    get transports() {
        return _.keys(transports);
    },

    /**
     * List available serializers
     */
    get serializers() {
        return _.keys(serializers);
    },

    /**
     * TODO
     */
    registerTransport() {

    },

    /**
     * Register custom serializer
     */
    registerSerializer(type, parseFunc, serializeFunc) {
        serializers[type] = {
            parse: parseFunc,
            serialize: serializeFunc
        };
    },


    /**
     * Create YAMP server
     */
    createServer(transport, opts, serializerOpts = {type: 'json'}) {

        var serializer = serializers[serializerOpts.type];
        if (!serializer) {
            throw new Error('Serializer not available: ' + serializerOpts.type);
        }

        var server = transports[transport].server;
        if (!server) {
            throw new Error("No server implementation for transport found: " + transport);
        }

        return new server(serializer, opts);
    },


    /**
     * Create YAMP client
     */
    createClient(transport, opts, serializerOpts = {type: 'json'}) {

        var serializer = serializers[serializerOpts.type];
        if (!serializer) {
            throw new Error('Serializer not available: ' + serializerOpts.type);
        }

        var client = transports[transport].client;
        if (!client) {
            throw new Error("No client implementation for transport found: " + transport);
        }

        return new client(serializer, opts);
    }
}


