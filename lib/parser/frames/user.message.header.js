/**
 * user.message.header.js
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = class UserMessageHeader {

    static async Parse(read) {
      return {
            'uid': (await read(16)),
            'uri': (await read(
                (await read(1)).readUInt8()
            )).toString()
        }
    }

    static serialize(write) {
        write(this.uid);
        write(new Buffer([this.uri.length]));
        write(Buffer.from(this.uri));
    }

}
