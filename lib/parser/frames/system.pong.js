/**
 * system.pong.js
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = class SystemPong {

    static get CODE() { return 0x02 }
    get CODE() { return SystemPong.CODE }
    
    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new SystemPong({
            'payload': (await read(
                (await read(1)).readUInt8()
            )).toString()
        })
    }

    serialize(write) {

        write(new Buffer([this.CODE]));
        write(new Buffer([this.payload.length]));
        write(Buffer.from(this.payload));
    }

}
