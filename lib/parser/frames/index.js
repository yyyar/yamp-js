/**
 * frames/index.js - frames registry
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = {
    SystemHandshake: require('./system.handshake.js'),
    SystemPing: require('./system.ping.js'),
    SystemClose: require('./system.close.js'),

    Event: require('./event.js'),
    Request: require('./request.js'),
    Cancel: require('./cancel.js'),
    Response: require('./response.js'),
}
