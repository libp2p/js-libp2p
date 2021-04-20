/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-crypto-keys"] || ($protobuf.roots["libp2p-crypto-keys"] = {});

/**
 * KeyType enum.
 * @exports KeyType
 * @enum {number}
 * @property {number} RSA=0 RSA value
 * @property {number} Ed25519=1 Ed25519 value
 * @property {number} Secp256k1=2 Secp256k1 value
 */
$root.KeyType = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "RSA"] = 0;
    values[valuesById[1] = "Ed25519"] = 1;
    values[valuesById[2] = "Secp256k1"] = 2;
    return values;
})();

$root.PublicKey = (function() {

    /**
     * Properties of a PublicKey.
     * @exports IPublicKey
     * @interface IPublicKey
     * @property {KeyType} Type PublicKey Type
     * @property {Uint8Array} Data PublicKey Data
     */

    /**
     * Constructs a new PublicKey.
     * @exports PublicKey
     * @classdesc Represents a PublicKey.
     * @implements IPublicKey
     * @constructor
     * @param {IPublicKey=} [p] Properties to set
     */
    function PublicKey(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * PublicKey Type.
     * @member {KeyType} Type
     * @memberof PublicKey
     * @instance
     */
    PublicKey.prototype.Type = 0;

    /**
     * PublicKey Data.
     * @member {Uint8Array} Data
     * @memberof PublicKey
     * @instance
     */
    PublicKey.prototype.Data = $util.newBuffer([]);

    /**
     * Encodes the specified PublicKey message. Does not implicitly {@link PublicKey.verify|verify} messages.
     * @function encode
     * @memberof PublicKey
     * @static
     * @param {IPublicKey} m PublicKey message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PublicKey.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(8).int32(m.Type);
        w.uint32(18).bytes(m.Data);
        return w;
    };

    /**
     * Decodes a PublicKey message from the specified reader or buffer.
     * @function decode
     * @memberof PublicKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {PublicKey} PublicKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PublicKey.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.PublicKey();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.Type = r.int32();
                break;
            case 2:
                m.Data = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("Type"))
            throw $util.ProtocolError("missing required 'Type'", { instance: m });
        if (!m.hasOwnProperty("Data"))
            throw $util.ProtocolError("missing required 'Data'", { instance: m });
        return m;
    };

    /**
     * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PublicKey
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {PublicKey} PublicKey
     */
    PublicKey.fromObject = function fromObject(d) {
        if (d instanceof $root.PublicKey)
            return d;
        var m = new $root.PublicKey();
        switch (d.Type) {
        case "RSA":
        case 0:
            m.Type = 0;
            break;
        case "Ed25519":
        case 1:
            m.Type = 1;
            break;
        case "Secp256k1":
        case 2:
            m.Type = 2;
            break;
        }
        if (d.Data != null) {
            if (typeof d.Data === "string")
                $util.base64.decode(d.Data, m.Data = $util.newBuffer($util.base64.length(d.Data)), 0);
            else if (d.Data.length)
                m.Data = d.Data;
        }
        return m;
    };

    /**
     * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PublicKey
     * @static
     * @param {PublicKey} m PublicKey
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PublicKey.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.Type = o.enums === String ? "RSA" : 0;
            if (o.bytes === String)
                d.Data = "";
            else {
                d.Data = [];
                if (o.bytes !== Array)
                    d.Data = $util.newBuffer(d.Data);
            }
        }
        if (m.Type != null && m.hasOwnProperty("Type")) {
            d.Type = o.enums === String ? $root.KeyType[m.Type] : m.Type;
        }
        if (m.Data != null && m.hasOwnProperty("Data")) {
            d.Data = o.bytes === String ? $util.base64.encode(m.Data, 0, m.Data.length) : o.bytes === Array ? Array.prototype.slice.call(m.Data) : m.Data;
        }
        return d;
    };

    /**
     * Converts this PublicKey to JSON.
     * @function toJSON
     * @memberof PublicKey
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PublicKey.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PublicKey;
})();

$root.PrivateKey = (function() {

    /**
     * Properties of a PrivateKey.
     * @exports IPrivateKey
     * @interface IPrivateKey
     * @property {KeyType} Type PrivateKey Type
     * @property {Uint8Array} Data PrivateKey Data
     */

    /**
     * Constructs a new PrivateKey.
     * @exports PrivateKey
     * @classdesc Represents a PrivateKey.
     * @implements IPrivateKey
     * @constructor
     * @param {IPrivateKey=} [p] Properties to set
     */
    function PrivateKey(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * PrivateKey Type.
     * @member {KeyType} Type
     * @memberof PrivateKey
     * @instance
     */
    PrivateKey.prototype.Type = 0;

    /**
     * PrivateKey Data.
     * @member {Uint8Array} Data
     * @memberof PrivateKey
     * @instance
     */
    PrivateKey.prototype.Data = $util.newBuffer([]);

    /**
     * Encodes the specified PrivateKey message. Does not implicitly {@link PrivateKey.verify|verify} messages.
     * @function encode
     * @memberof PrivateKey
     * @static
     * @param {IPrivateKey} m PrivateKey message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PrivateKey.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(8).int32(m.Type);
        w.uint32(18).bytes(m.Data);
        return w;
    };

    /**
     * Decodes a PrivateKey message from the specified reader or buffer.
     * @function decode
     * @memberof PrivateKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {PrivateKey} PrivateKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PrivateKey.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.PrivateKey();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.Type = r.int32();
                break;
            case 2:
                m.Data = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("Type"))
            throw $util.ProtocolError("missing required 'Type'", { instance: m });
        if (!m.hasOwnProperty("Data"))
            throw $util.ProtocolError("missing required 'Data'", { instance: m });
        return m;
    };

    /**
     * Creates a PrivateKey message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PrivateKey
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {PrivateKey} PrivateKey
     */
    PrivateKey.fromObject = function fromObject(d) {
        if (d instanceof $root.PrivateKey)
            return d;
        var m = new $root.PrivateKey();
        switch (d.Type) {
        case "RSA":
        case 0:
            m.Type = 0;
            break;
        case "Ed25519":
        case 1:
            m.Type = 1;
            break;
        case "Secp256k1":
        case 2:
            m.Type = 2;
            break;
        }
        if (d.Data != null) {
            if (typeof d.Data === "string")
                $util.base64.decode(d.Data, m.Data = $util.newBuffer($util.base64.length(d.Data)), 0);
            else if (d.Data.length)
                m.Data = d.Data;
        }
        return m;
    };

    /**
     * Creates a plain object from a PrivateKey message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PrivateKey
     * @static
     * @param {PrivateKey} m PrivateKey
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PrivateKey.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.Type = o.enums === String ? "RSA" : 0;
            if (o.bytes === String)
                d.Data = "";
            else {
                d.Data = [];
                if (o.bytes !== Array)
                    d.Data = $util.newBuffer(d.Data);
            }
        }
        if (m.Type != null && m.hasOwnProperty("Type")) {
            d.Type = o.enums === String ? $root.KeyType[m.Type] : m.Type;
        }
        if (m.Data != null && m.hasOwnProperty("Data")) {
            d.Data = o.bytes === String ? $util.base64.encode(m.Data, 0, m.Data.length) : o.bytes === Array ? Array.prototype.slice.call(m.Data) : m.Data;
        }
        return d;
    };

    /**
     * Converts this PrivateKey to JSON.
     * @function toJSON
     * @memberof PrivateKey
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PrivateKey.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PrivateKey;
})();

module.exports = $root;
