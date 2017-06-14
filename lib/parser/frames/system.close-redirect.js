/**
 * system.close-redirect.js
 * 
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash');

module.exports = class SystemCloseRedirect {

    static get CODE() { return 0x04 }
    get CODE() { return SystemCloseRedirect.CODE }

    constructor(props) {
        Object.assign(this, props);
    }

    static async Parse(read) {
        return new SystemCloseRedirect({
            'url': (await read(
                (await read(1)).readUInt8()
            )).toString()
        })
    }

    serialize(write) {

        write(new Buffer([this.CODE]));
        write(new Buffer([this.url.length]));
        write(Buffer.from(this.url));
    }

}
