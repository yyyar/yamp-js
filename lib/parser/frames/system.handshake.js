/**
 * system.handshake.js
 * 
 * @author Yaroslav Pogrebnyak
 */

module.exports = class SystemHandshake {

    static get CODE() { return 0x00 }
    get CODE() { return SystemHandshake.CODE }

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {

        return new SystemHandshake({
            'version': (await read(2)).readUInt16BE(),
            'serializer': (await read(
                (await read(1)).readUInt8()
            )).toString()
        })
    }

    serialize(write) {

        write(new Buffer([this.CODE]));

        let version = new Buffer(2);
        version.writeUInt16BE(this.version);
        write(version);

        write(new Buffer([ this.serializer.length ] ));
        write(new Buffer.from(this.serializer));
    }

}
