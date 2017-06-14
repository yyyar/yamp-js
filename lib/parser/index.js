/**
 * parser.js - binary protocol parser
 *
 * @author Yaroslav Pogrebnyak
 */

const _ = require('lodash'),
      util = require('util'),
      EventEmitter = require('events').EventEmitter,
      BufferList = require('bl');

/**
 *  Yamp protocol Parser
 */
var Parser = module.exports = class Parser extends EventEmitter {

    /**
     *  Creates new instance of Parser
     */
    constructor() {
        super()

        // Buffer list of unparsed data
        this._bl = new BufferList();

        // Indicates if parser stopped
        this.closed = false;

        // start loop
        this.loop();
    }


    /**
     * Feed parser with data
     */
    feed(buf) {
        this._bl.append(buf);
        this.emit('continue');
    }

    /**
     * Stop parsing
     */
    stop() {
        this.closed = true;
        this.emit('continue');
    }

    /**
     * Read next c bytes waiting until they
     * are available
     */
    async readWait(c) {

        if (this._bl.length >= c) {
            let b = this._bl.slice(0, c);
            this._bl.consume(c);
            return b;
        }

        if (this.closed) {
            throw "EOF";
        }

        var p = new Promise((resolve, reject) => {
            this.once('continue', () => {
                this.readWait(c).then(resolve, reject);
            });
        });

        return await p; 
    }


    /**
     * Parsing loop
     */
    async loop() {

        try {
            await this.nextFrame();
        } catch(e) {

            if (e == "EOF") {
                return this.emit("close", {});
            }

            throw e;
        }
    }

    /**
     * 
     */
    async nextFrame() {

        let frameType = (await this.readWait(1)).readUInt8();
        let parse = FRAME_TYPES[frameType].Parse;
        let frame = await parse(this.readWait.bind(this));


        this.emit('frame', frame);

        process.nextTick(() => {
            this.loop();
        });
    }


}

/**
 * Frame type -> frame mapper
 */
const FRAME_TYPES = {
    0x00: require('./frames/system.handshake.js'),
    0x01: require('./frames/system.ping.js'),
    0x02: require('./frames/system.pong.js'),
    0x03: require('./frames/system.close.js'),
    0x04: require('./frames/system.close-redirect.js'),
    0x05: require('./frames/event.js'),
    0x06: require('./frames/request.js'),
    0x07: require('./frames/cancel.js'),
    0x08: require('./frames/response.js'),
}



/*

var a = new Parser();
a.on('frame', (m) => {
    console.log('got new message', m);
});
//a.feed(new Buffer(0))
//setInterval( () => {
a.feed(new Buffer([0,0x56, 0x56, 0x01, 0x55]))
a.feed(new Buffer([0,0x56, 0x56]))
a.stop();


var e = require('./frames/event.js');
e = new e({
    'uid': new Buffer(16),
    'uri': 'hello',
    'body': new Buffer([0xDE])
});

e.serialize(console.log.bind(console));

   // console.log(a.bl.length);
  //  console.log(a.bl.readUInt8(0));
//}, 1000);
*/
