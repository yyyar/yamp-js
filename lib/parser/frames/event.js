/**
 * event.js
 * 
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash'),
      UserMessageHeader = require('./user.message.header.js'),
      UserMessageBody = require('./user.message.body.js');

module.exports = class Event {

    static get CODE() { return 0x10 }
    get CODE() { return Event.CODE }

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new Event(_.merge({},
            await UserMessageHeader.Parse(read),
            await UserMessageBody.Parse(read)
        ));
    }

    serialize(write) {

        write(new Buffer([this.CODE]));
        UserMessageHeader.serialize.bind(this)(write)
        UserMessageBody.serialize.bind(this)(write)
    }

}
