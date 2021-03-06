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

        this._opts = _.merge({
            responseTimeoutMs: null
        }, opts);

        /* ----- message body serializer ----- */
        this._bodySerializer = opts.serializer;

        /* ----- frame parser and serializer ----- */
        this._parser = new Parser();

       /* ----- connection adapter ----- */
        this._conn = connAdapter;

        /* ----- internal messages eventemitter ----- */
        this._messages = new EventEmitter();

        /* ----- party role ----- */
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

        this._parser.on('error', (err) => {
            this._conn.close();
            this._closed = true;
            this.emit('close', err);
        });

        this._conn.on('close', () => {
            this._closed = true;
            this._parser.stop();
        });


        /* -------------- dispatch frames ----------------- */

        this._parser.on('frame', (frame) => {
             //console.log('>>', frame.constructor.name, frame);

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
        //console.log('<<', frame.constructor.name, frame, frame.uri || '', (frame.uid || '').toString('hex'));
        frame.serialize(this._conn.write.bind(this._conn));
    }


    /**
     * Perform client-side handshake process
     */
    _handshakeClient() {

        /* send handshake */
        this._write(new Frames.SystemHandshake({ 
            version: YAMP_VERSION
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

            /* discard client if version does not match */
            if (frame.version !== YAMP_VERSION) {
                return this.close(Frames.SystemClose.VERSION_NOT_SUPPORTED, 'Version ' + frame.version + ' not supported. Use ' + YAMP_VERSION);
            }

            this._write(frame);
            this.emit('ready', {});
        });
    }



    /* ------------------------- dispatching ------------------------- */

    [Frames.SystemClose.CODE](frame) {
        this._closeReason = frame.message;
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

    [Frames.Cancel.CODE](frame) {
        this._messages.emit([Frames.Cancel.CODE, frame.uri, frame.request_uid], frame);
    }

    [Frames.Response.CODE](frame) {

        var body = this._bodySerializer.parse(frame.body);
        var data = null;

        if (frame.type == Frames.Response.Types.CANCELLED) {
            data = [body, null, false]
        }
        else if (frame.type == Frames.Response.Types.ERROR) {
            data = [body, null, false]
        } else if (frame.type == Frames.Response.Types.DONE || frame.type == Frames.Response.Types.PROGRESS) {
            data = [null, body, frame.type == Frames.Response.Types.PROGRESS]
        }

        this._messages.emit([Frames.Response.CODE, frame.uri, frame.request_uid], data);
    }


    /* ------------------------- Public API ------------------------- */

    /**
     * Gracefully close connection sending
     * reason string to another party.
     */
    close(code, message) {

        if (!message) {
            message = code;
            code = null;
        }

        if (this._closed) {
            return;
        }

        this._write(new Frames.SystemClose({
            code: code || Frames.SystemClose.Codes.UNKNOWN,
            message: message || ''
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

        if (this._closed) {
            throw new Error('Sending event through closed connection');
        }

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
     *
     * - @callback(err, response) - callback to receive response or error
     */
    sendRequest(uri, obj, opts, callback) {

        if (this._closed) {
            throw new Error('Sending event through closed connection');
        }

        if (!callback) {
            callback = opts;
            opts = _.merge({}, {
                timeoutMs: this._opts.responseTimeoutMs
            }, opts);
        }

        /* send request */

        var request = new Frames.Request({
            uid: uuid.v1(null, new Buffer(16)),
            uri: uri,
            body: this._bodySerializer.serialize(obj)
        });

        this._write(request);


        /* Set response timeout if needed */

        let timeout = null;

        let timeoutHandler = () => {
            this._messages.removeAllListeners([Frames.Response.CODE, uri, request.uid]);
            callback(new Error('Timeout'));
        }

        let resetTimeout = () => {
            if (opts.timeoutMs) {
                timeout = setTimeout(timeoutHandler, opts.timeoutMs);
            }
        }

        resetTimeout();

        /* wait for response */
 
        this._messages.on([Frames.Response.CODE, uri, request.uid], ([err, data, progress]) => {

            clearTimeout(timeout);

            if (progress) {
                resetTimeout();
            } else {
                this._messages.removeAllListeners([Frames.Response.CODE, uri, request.uid]);
            }

            callback(err, data, progress);
        });

        return {
            uid: request.uid,
            cancel: () => {

                resetTimeout();

                this._write(new Frames.Cancel({
                    uid: uuid.v1(null, uuid.v1(null, new Buffer(16))),
                    uri: uri,
                    request_uid: request.uid
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
            var ctx = {};

            handleRequest(ctx, requestBody, (err, responseBody, opts = {}) => {

                let progress = opts.progress || false;

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

                /* handle graceful cancel and send response */
                handleCancel(ctx, true, (body) => {
                    this._write(new Frames.Response({
                        uid: uuid.v1(null, new Buffer(16)),
                        uri: request.uri,
                        request_uid: request.uid,
                        type: Frames.Response.Types.CANCELLED,
                        body: this._bodySerializer.serialize(body)
                    }));
                });

            });

        });
    }
};

