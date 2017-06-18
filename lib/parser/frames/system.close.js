/**
 * system.close.js
 * 
 * @author Yaroslav Pogrebnyak
 */


const _ = require('lodash');

module.exports = class SystemClose {

    static get CODE() { return 0x01 }
    get CODE() { return SystemClose.CODE }

    static get Codes() { return {
        UNKNOWN: 0x00,
        VERSION_NOT_SUPPORTED: 0x01,
        TIMEOUT: 0x02,
        REDIRECT: 0x03
    }}
    
    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new SystemClose({
            'code': (await read(1)).readUInt8(),
            'message': (await read(
                (await read(2)).readUInt16BE()
            )).toString()
        })
    }

    serialize(write) {

        let b = new Buffer(4)
        b.writeUInt8(this.CODE)
        b.writeUInt8(this.code, 1)
        b.writeUInt16BE(this.message.length, 2)
        b = Buffer.concat([b, Buffer.from(this.message)]);
        write(b);
    }

}
