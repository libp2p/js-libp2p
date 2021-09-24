/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-envelope"] || ($protobuf.roots["libp2p-envelope"] = {});

$root.Envelope = (function() {

    /**
     * Properties of an Envelope.
     * @exports IEnvelope
     * @interface IEnvelope
     * @property {Uint8Array|null} [publicKey] Envelope publicKey
     * @property {Uint8Array|null} [payloadType] Envelope payloadType
     * @property {Uint8Array|null} [payload] Envelope payload
     * @property {Uint8Array|null} [signature] Envelope signature
     */

    /**
     * Constructs a new Envelope.
     * @exports Envelope
     * @classdesc Represents an Envelope.
     * @implements IEnvelope
     * @constructor
     * @param {IEnvelope=} [p] Properties to set
     */
    function Envelope(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Envelope publicKey.
     * @member {Uint8Array} publicKey
     * @memberof Envelope
     * @instance
     */
    Envelope.prototype.publicKey = $util.newBuffer([]);

    /**
     * Envelope payloadType.
     * @member {Uint8Array} payloadType
     * @memberof Envelope
     * @instance
     */
    Envelope.prototype.payloadType = $util.newBuffer([]);

    /**
     * Envelope payload.
     * @member {Uint8Array} payload
     * @memberof Envelope
     * @instance
     */
    Envelope.prototype.payload = $util.newBuffer([]);

    /**
     * Envelope signature.
     * @member {Uint8Array} signature
     * @memberof Envelope
     * @instance
     */
    Envelope.prototype.signature = $util.newBuffer([]);

    /**
     * Encodes the specified Envelope message. Does not implicitly {@link Envelope.verify|verify} messages.
     * @function encode
     * @memberof Envelope
     * @static
     * @param {IEnvelope} m Envelope message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Envelope.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
            w.uint32(10).bytes(m.publicKey);
        if (m.payloadType != null && Object.hasOwnProperty.call(m, "payloadType"))
            w.uint32(18).bytes(m.payloadType);
        if (m.payload != null && Object.hasOwnProperty.call(m, "payload"))
            w.uint32(26).bytes(m.payload);
        if (m.signature != null && Object.hasOwnProperty.call(m, "signature"))
            w.uint32(42).bytes(m.signature);
        return w;
    };

    /**
     * Decodes an Envelope message from the specified reader or buffer.
     * @function decode
     * @memberof Envelope
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Envelope} Envelope
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Envelope.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Envelope();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.publicKey = r.bytes();
                break;
            case 2:
                m.payloadType = r.bytes();
                break;
            case 3:
                m.payload = r.bytes();
                break;
            case 5:
                m.signature = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Envelope
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Envelope} Envelope
     */
    Envelope.fromObject = function fromObject(d) {
        if (d instanceof $root.Envelope)
            return d;
        var m = new $root.Envelope();
        if (d.publicKey != null) {
            if (typeof d.publicKey === "string")
                $util.base64.decode(d.publicKey, m.publicKey = $util.newBuffer($util.base64.length(d.publicKey)), 0);
            else if (d.publicKey.length)
                m.publicKey = d.publicKey;
        }
        if (d.payloadType != null) {
            if (typeof d.payloadType === "string")
                $util.base64.decode(d.payloadType, m.payloadType = $util.newBuffer($util.base64.length(d.payloadType)), 0);
            else if (d.payloadType.length)
                m.payloadType = d.payloadType;
        }
        if (d.payload != null) {
            if (typeof d.payload === "string")
                $util.base64.decode(d.payload, m.payload = $util.newBuffer($util.base64.length(d.payload)), 0);
            else if (d.payload.length)
                m.payload = d.payload;
        }
        if (d.signature != null) {
            if (typeof d.signature === "string")
                $util.base64.decode(d.signature, m.signature = $util.newBuffer($util.base64.length(d.signature)), 0);
            else if (d.signature.length)
                m.signature = d.signature;
        }
        return m;
    };

    /**
     * Creates a plain object from an Envelope message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Envelope
     * @static
     * @param {Envelope} m Envelope
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Envelope.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            if (o.bytes === String)
                d.publicKey = "";
            else {
                d.publicKey = [];
                if (o.bytes !== Array)
                    d.publicKey = $util.newBuffer(d.publicKey);
            }
            if (o.bytes === String)
                d.payloadType = "";
            else {
                d.payloadType = [];
                if (o.bytes !== Array)
                    d.payloadType = $util.newBuffer(d.payloadType);
            }
            if (o.bytes === String)
                d.payload = "";
            else {
                d.payload = [];
                if (o.bytes !== Array)
                    d.payload = $util.newBuffer(d.payload);
            }
            if (o.bytes === String)
                d.signature = "";
            else {
                d.signature = [];
                if (o.bytes !== Array)
                    d.signature = $util.newBuffer(d.signature);
            }
        }
        if (m.publicKey != null && m.hasOwnProperty("publicKey")) {
            d.publicKey = o.bytes === String ? $util.base64.encode(m.publicKey, 0, m.publicKey.length) : o.bytes === Array ? Array.prototype.slice.call(m.publicKey) : m.publicKey;
        }
        if (m.payloadType != null && m.hasOwnProperty("payloadType")) {
            d.payloadType = o.bytes === String ? $util.base64.encode(m.payloadType, 0, m.payloadType.length) : o.bytes === Array ? Array.prototype.slice.call(m.payloadType) : m.payloadType;
        }
        if (m.payload != null && m.hasOwnProperty("payload")) {
            d.payload = o.bytes === String ? $util.base64.encode(m.payload, 0, m.payload.length) : o.bytes === Array ? Array.prototype.slice.call(m.payload) : m.payload;
        }
        if (m.signature != null && m.hasOwnProperty("signature")) {
            d.signature = o.bytes === String ? $util.base64.encode(m.signature, 0, m.signature.length) : o.bytes === Array ? Array.prototype.slice.call(m.signature) : m.signature;
        }
        return d;
    };

    /**
     * Converts this Envelope to JSON.
     * @function toJSON
     * @memberof Envelope
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Envelope.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Envelope;
})();

module.exports = $root;
