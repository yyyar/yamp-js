/**
 * response.js
 * 
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash'),
      UserMessageHeader = require('./user.message.header.js'),
      UserMessageBody = require('./user.message.body.js');

module.exports = class Response {

    static get CODE() { return 0x08 }
    get CODE() { return Response.CODE }

    static get Types() { return {
        DONE: 0x00,
        ERROR: 0x01,
        PROGRESS: 0x02,
        CANCELLED: 0x03
    }}

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
       return new Response(_.merge({},
            await UserMessageHeader.Parse(read),
            { 'request_uid': await read(16) },
            { 'type': (await read(1)).readUInt8() },
            await UserMessageBody.Parse(read)
        ));

    }

    serialize(write) {

        write(new Buffer([this.CODE]));

        UserMessageHeader.serialize.bind(this)(write)
        write(this.request_uid);
        write(new Buffer([this.type]));
        UserMessageBody.serialize.bind(this)(write)
    }

}
