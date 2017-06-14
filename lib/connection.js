/**
 * connection.js - yamp connection implementation
 *
 * @author Yaroslav Pogrebnyak <yyyaroslav@gmail.com>
 */

const _ = require('lodash'),
      uuid = require('uuid'),
      Parser = require('./parser'),
      EventEmitter = require('events').EventEmitter,
      Frames = require('./parser/frames');

/**
 * Yamp protocol version
 */
const YAMP_VERSION = 0x01;

/**
 * Yamp connection abstracts transport
 */
module.exports = class YampConnection extends EventEmitter  {

    /**
     * Returns another party ip address
     */
    get remoteAddress() {
        return this._conn.remoteAddress;
    }

    /**
     * Creates new instance of YampConnection
     *
     * @connAdapter   - yamp adapter of transport connection
     * @opts          - options
     *   .isClient    - indicates that connection is client party
     *   .serializer  - yamp body serializer object
     */
    constructor(connAdapter, opts) {

        super();

        /* ------------------- variables ------------------ */

        /* ----- close variables ----- */
        this._closed = false;
        this._closeReason = null;
        this._closeRedirectUrl = null;


        /* ----- message body serializer ----- */
        this._bodySerializer = opts.serializer;

        /* ----- frame parser and serializer ----- */
        this._parser = new Parser();

       /* ----- connection adapter ----- */
        this._conn = connAdapter;

        /* ----- internal messages eventemitter ----- */
        this._messages = new EventEmitter();

        this._isClient = opts.isClient;

        /* ---------------- perfrom handshake ------------- */

        if (opts.isClient) {
            this._handshakeClient();
        } else {
            this._handshakeServer();
        }

        /* --------------- handle events ------------------ */

        this._conn.on('data', (data) => {
            this._parser.feed(data);
        });

        this._parser.on('close', () => {
           this.emit('close', this._closeReason);
        })

        this._conn.on('close', () => {
            this._closed = true;
            this._parser.stop();
        });


        /* -------------- dispatch frames ----------------- */

        this._parser.on('frame', (frame) => {
            // console.log('>>', frame.constructor.name);

            if (this[frame.CODE]) {
                return this[frame.CODE](frame);
            }

            this._messages.emit(frame.CODE, frame);
        });

      }



    /* -------------------------- private methods ---------------------- */

    /**
     * Send message to another party.
     */
    _write(frame) {
        //console.log('<<', frame.constructor.name, frame.uri || '', (frame.uid || '').toString('hex'));
        frame.serialize(this._conn.write.bind(this._conn));
    }


    /**
     * Perform client-side handshake process
     */
    _handshakeClient() {

        /* send handshake */
        this._write(new Frames.SystemHandshake({ 
            version: 0x01,
            serializer: this._bodySerializer.type
        }));


        /* if we get handshake back, we are ready to go */
        this._messages.once(Frames.SystemHandshake.CODE, (message) => {
            this.emit('ready', {});
        });
    }

    /**
     * Perform server-side handshake process
     */
    _handshakeServer() {

        /* wait for client to send handshake */
        this._messages.once(Frames.SystemHandshake.CODE, (frame) => {

            /* we can match client serializer, respond with the same handshake */
            if (frame.serializer == this._bodySerializer.type) {
                this._write(frame);
                this.emit('ready', {});
                return
            }

            /* serializer not supported, drop connection */
            return this.close('Serializer ' + frame.serializer + ' not supported. Use ' + this._bodySerializer.type);
        });
    }



    /* ------------------------- dispatching ------------------------- */

    [Frames.SystemClose.CODE](frame) {
        this._closeReason = frame.reason;
        this._closeRedirectUrl = null;
        this._conn.close();
    }

    [Frames.SystemCloseRedirect.CODE](frame) {
        this._closeRedirectUrl = frame.url;
        this._closeReason = null;
        this._conn.close();
    }

    [Frames.Event.CODE](frame) {
        var body = this._bodySerializer.parse(frame.body);
        this._messages.emit([Frames.Event.CODE, frame.uri], body);
    }

    [Frames.Request.CODE](frame) {
        var body = this._bodySerializer.parse(frame.body);
        this._messages.emit([Frames.Request.CODE, frame.uri], [frame, body]);
    }

    [Frames.Response.CODE](frame) {

        var body = null;
        var data = null;
        if (frame.type == Frames.Response.Types.CANCELLED) {
            data = ['cancelled'];
        }
        if (frame.type == Frames.Response.Types.ERROR) {
            body = this._bodySerializer.parse(frame.body);
            data = [body]
        } else if (frame.type == Frames.Response.Types.DONE || frame.type == Frames.Response.Types.PROGRESS) {
            body = this._bodySerializer.parse(frame.body);
            data = [null, body, frame.type == Frames.Response.Types.PROGRESS]
        }

        this._messages.emit([Frames.Response.CODE, frame.uri, frame.request_uid], data);
    }

    [Frames.Cancel.CODE](frame) {
        this._messages.emit([Frames.Cancel.CODE, frame.uri, frame.request_uid], frame);
    }




    /* ------------------------- Public API ------------------------- */

    /**
     * Gracefully close connection sending
     * reason string to another party.
     */
    close(reason) {

        if (this._closed) {
            return;
        }

        this._write(new Frames.SystemClose({
                reason: reason || ''
        }));

        this._conn.close();
    }


    /* ---------- User Events ---------- */

    /**
     * Send event to other party
     *
     * @uri - unique identifier of event
     * @obj - object that will be serialized
     */
    sendEvent(uri, obj) {
        this._write(new Frames.Event({
            uid: uuid.v1(null, new Buffer(16)),
            uri: uri,
            body: this._bodySerializer.serialize(obj)
        }));
    }

    /**
     * Handle event from other party
     *
     * @uri - unique event type identifier
     * @callback(obj) - callback to get deserialized event object
     */
    onEvent(uri, callback) {
        this._messages.on([Frames.Event.CODE, uri], callback);
    }



    /* ---------- User Requests / Responses ---------- */


    /**
     * Send request to other party, awaiting response
     *
     * - @uri - unique request name identifier
     * - @obj - request body that will be serialized
     * - @opts - (optional) request properties:
     *   { progressive: false } 
     *
     * - @callback(err, response) - callback to receive response or error
     */
    sendRequest(uri, obj, opts, callback) {

        if (!callback) {
            callback = opts;
            opts = { progressive: false };
        }

        /* send request */

        var request = new Frames.Request({
            uid: uuid.v1(null, new Buffer(16)),
            uri: uri,
            progressive: opts.progressive,
            body: this._bodySerializer.serialize(obj)
        });

        this._write(request);


        /* wait for response */
 
        this._messages.on([Frames.Response.CODE, uri, request.uid], ([err, data, progress]) => {

            if (!progress) {
                this._messages.removeAllListeners([Frames.Response.CODE, uri, request.uid]);
            }

            callback(err, data, progress);
        });

        return {
            uid: request.uid,
            cancel: (kill) => {

                // if kill cancel, unsubscribe from responses
                if (kill) {
                    this._messages.removeAllListeners([Frames.Responde.CODE, uri, request.uid]);
                }

                this._write(new Frames.Cancel({
                    uid: uuid.v1(null, new Buffer(16)),
                    uri: uri,
                    request_uid: request.uid,
                    kill: !!kill,
                }));
            }
        };
    }


    /**
     * Handle request from other party and respond with response or error
     *
     */
    onRequest(uri, handleRequest, handleCancel) {

        this._messages.on([Frames.Request.CODE, uri], ([request, requestBody]) => {

            var cancelled = false;

            handleRequest(requestBody, (err, responseBody, opts = {}) => {

                let progress = opts.progress || false;

                // Do not send progressive responses if request is not progressive
                if (!request.progressive && progress) {
                    return;
                }

                // Do not send response if it was cancelled
                if (cancelled) {
                    return;
                }

                // don't handle cancel because we're sending response
                if (!progress) {
                    this._messages.removeAllListeners([Frames.Cancel.CODE, uri, request.uid]);
                }

                this._write(new Frames.Response({
                    uid: uuid.v1(null, new Buffer(16)),
                    uri: request.uri,
                    request_uid: request.uid,
                    type: err ? Frames.Response.Types.ERROR : (progress ? Frames.Response.Types.PROGRESS : Frames.Response.Types.DONE),
                    body: this._bodySerializer.serialize( err ? err : responseBody)
                }));
            });


            /* setup cancel listener only if cancel callback provided */

            if (!handleCancel) {
                return;
            }

            this._messages.once([Frames.Cancel.CODE, uri, request.uid], (cancel) => {

                cancelled = true;

                /* if kill cancel requested, do not wait until completion and do not send CANCELLED response */
                if (cancel.kill) {
                    return handleCancel(false, () => {});
                }

                /* handle graceful cancel and send response */
                handleCancel(true, (err, responseBody) => {
                    this._write(new Frames.Response({
                        uid: uuid.v1(null, new Buffer(16)),
                        uri: request.uri,
                        request_uid: request.uid,
                        type: Frames.Response.Types.CANCELLED,
                        body: new Buffer(0)
                    }));
                });

            });

        });
    }
};

