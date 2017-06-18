/**
 * cancel.js
 * 
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash'),
      UserMessageHeader = require('./user.message.header.js'),
      UserMessageBody = require('./user.message.body.js');

module.exports = class Cancel {

    static get CODE() { return 0x12 }

    get CODE() { return Cancel.CODE }

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
         return new Cancel(_.merge({},
            await UserMessageHeader.Parse(read),
            { 'request_uid': await read(16) }
        ));

    }

    serialize(write) {

        write(new Buffer([this.CODE]));

        UserMessageHeader.serialize.bind(this)(write)
        write(this.request_uid);
        write(new Buffer([this.kill]));
    }

}
