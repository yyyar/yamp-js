/**
 * request.js
 * 
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash'),
      UserMessageHeader = require('./user.message.header.js'),
      UserMessageBody = require('./user.message.body.js');

module.exports = class Request {

    static get CODE() { return 0x11 }
    get CODE() { return Request.CODE }

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new Request(_.merge({},
            await UserMessageHeader.Parse(read),
            { 'progressive': (await read(1)).readUInt8() == 1 },
            await UserMessageBody.Parse(read)
        ));
    }

    serialize(write) {
        write(new Buffer([this.CODE]));

        UserMessageHeader.serialize.bind(this)(write)
        write(new Buffer([this.progressive]))
        UserMessageBody.serialize.bind(this)(write)
    }

}
