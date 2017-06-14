/**
 * system.close.js
 * 
 * @author Yaroslav Pogrebnyak
 */


const _ = require('lodash');

module.exports = class SystemClose {

    static get CODE() { return 0x03 }
    get CODE() { return SystemClose.CODE }
    
    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new SystemClose({
            'reason': (await read(
                (await read(2)).readUInt16BE()
            )).toString()
        })
    }

    serialize(write) {

        write(new Buffer([this.CODE]));

        let size = new Buffer(2);
        size.writeUInt16BE(this.reason.length);
        write(size);

        write(Buffer.from(this.reason));
    }

}
