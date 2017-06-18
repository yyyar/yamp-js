/**
 * system.ping.js
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = class SystemPing {

    static get CODE() { return 0x02 }
    get CODE() { return SystemPing.CODE }
    
    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new SystemPing({
            'ack': !!(await read(1)).readUInt8(),
            'payload': (await read(
                (await read(1)).readUInt8()
            )).toString()
        })
    }

    serialize(write) {

        write(new Buffer([this.CODE]));
        write(new Buffer([this.ack]));
        write(new Buffer([this.payload.length]));
        write(Buffer.from(this.payload));
    }

}
