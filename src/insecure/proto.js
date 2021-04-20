/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-plaintext"] || ($protobuf.roots["libp2p-plaintext"] = {});

$root.Exchange = (function() {

    /**
     * Properties of an Exchange.
     * @exports IExchange
     * @interface IExchange
     * @property {Uint8Array|null} [id] Exchange id
     * @property {IPublicKey|null} [pubkey] Exchange pubkey
     */

    /**
     * Constructs a new Exchange.
     * @exports Exchange
     * @classdesc Represents an Exchange.
     * @implements IExchange
     * @constructor
     * @param {IExchange=} [p] Properties to set
     */
    function Exchange(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Exchange id.
     * @member {Uint8Array} id
     * @memberof Exchange
     * @instance
     */
    Exchange.prototype.id = $util.newBuffer([]);

    /**
     * Exchange pubkey.
     * @member {IPublicKey|null|undefined} pubkey
     * @memberof Exchange
     * @instance
     */
    Exchange.prototype.pubkey = null;

    /**
     * Encodes the specified Exchange message. Does not implicitly {@link Exchange.verify|verify} messages.
     * @function encode
     * @memberof Exchange
     * @static
     * @param {IExchange} m Exchange message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Exchange.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.id != null && Object.hasOwnProperty.call(m, "id"))
            w.uint32(10).bytes(m.id);
        if (m.pubkey != null && Object.hasOwnProperty.call(m, "pubkey"))
            $root.PublicKey.encode(m.pubkey, w.uint32(18).fork()).ldelim();
        return w;
    };

    /**
     * Decodes an Exchange message from the specified reader or buffer.
     * @function decode
     * @memberof Exchange
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Exchange} Exchange
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Exchange.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Exchange();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.id = r.bytes();
                break;
            case 2:
                m.pubkey = $root.PublicKey.decode(r, r.uint32());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates an Exchange message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Exchange
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Exchange} Exchange
     */
    Exchange.fromObject = function fromObject(d) {
        if (d instanceof $root.Exchange)
            return d;
        var m = new $root.Exchange();
        if (d.id != null) {
            if (typeof d.id === "string")
                $util.base64.decode(d.id, m.id = $util.newBuffer($util.base64.length(d.id)), 0);
            else if (d.id.length)
                m.id = d.id;
        }
        if (d.pubkey != null) {
            if (typeof d.pubkey !== "object")
                throw TypeError(".Exchange.pubkey: object expected");
            m.pubkey = $root.PublicKey.fromObject(d.pubkey);
        }
        return m;
    };

    /**
     * Creates a plain object from an Exchange message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Exchange
     * @static
     * @param {Exchange} m Exchange
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Exchange.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            if (o.bytes === String)
                d.id = "";
            else {
                d.id = [];
                if (o.bytes !== Array)
                    d.id = $util.newBuffer(d.id);
            }
            d.pubkey = null;
        }
        if (m.id != null && m.hasOwnProperty("id")) {
            d.id = o.bytes === String ? $util.base64.encode(m.id, 0, m.id.length) : o.bytes === Array ? Array.prototype.slice.call(m.id) : m.id;
        }
        if (m.pubkey != null && m.hasOwnProperty("pubkey")) {
            d.pubkey = $root.PublicKey.toObject(m.pubkey, o);
        }
        return d;
    };

    /**
     * Converts this Exchange to JSON.
     * @function toJSON
     * @memberof Exchange
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Exchange.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Exchange;
})();

/**
 * KeyType enum.
 * @exports KeyType
 * @enum {number}
 * @property {number} RSA=0 RSA value
 * @property {number} Ed25519=1 Ed25519 value
 * @property {number} Secp256k1=2 Secp256k1 value
 * @property {number} ECDSA=3 ECDSA value
 */
$root.KeyType = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "RSA"] = 0;
    values[valuesById[1] = "Ed25519"] = 1;
    values[valuesById[2] = "Secp256k1"] = 2;
    values[valuesById[3] = "ECDSA"] = 3;
    return values;
})();

$root.PublicKey = (function() {

    /**
     * Properties of a PublicKey.
     * @exports IPublicKey
     * @interface IPublicKey
     * @property {KeyType|null} [Type] PublicKey Type
     * @property {Uint8Array|null} [Data] PublicKey Data
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
        if (m.Type != null && Object.hasOwnProperty.call(m, "Type"))
            w.uint32(8).int32(m.Type);
        if (m.Data != null && Object.hasOwnProperty.call(m, "Data"))
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
        case "ECDSA":
        case 3:
            m.Type = 3;
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

module.exports = $root;
