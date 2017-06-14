/**
 * user.message.body.js
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = class UserMessageBody {

    static async Parse(read) {
      return {
            'body': await read((await read(4)).readUInt32BE())
        }
    }

    static serialize(write) {
        let b = new Buffer(4);
        b.writeUInt32BE(this.body.length);
        write(b);
        write(this.body);
    }

}
