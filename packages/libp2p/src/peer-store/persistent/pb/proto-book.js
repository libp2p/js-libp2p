/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-proto-book"] || ($protobuf.roots["libp2p-proto-book"] = {});

$root.Protocols = (function() {

    /**
     * Properties of a Protocols.
     * @exports IProtocols
     * @interface IProtocols
     * @property {Array.<string>|null} [protocols] Protocols protocols
     */

    /**
     * Constructs a new Protocols.
     * @exports Protocols
     * @classdesc Represents a Protocols.
     * @implements IProtocols
     * @constructor
     * @param {IProtocols=} [p] Properties to set
     */
    function Protocols(p) {
        this.protocols = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Protocols protocols.
     * @member {Array.<string>} protocols
     * @memberof Protocols
     * @instance
     */
    Protocols.prototype.protocols = $util.emptyArray;

    /**
     * Encodes the specified Protocols message. Does not implicitly {@link Protocols.verify|verify} messages.
     * @function encode
     * @memberof Protocols
     * @static
     * @param {IProtocols} m Protocols message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Protocols.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.protocols != null && m.protocols.length) {
            for (var i = 0; i < m.protocols.length; ++i)
                w.uint32(10).string(m.protocols[i]);
        }
        return w;
    };

    /**
     * Decodes a Protocols message from the specified reader or buffer.
     * @function decode
     * @memberof Protocols
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Protocols} Protocols
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Protocols.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Protocols();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.protocols && m.protocols.length))
                    m.protocols = [];
                m.protocols.push(r.string());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Protocols message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Protocols
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Protocols} Protocols
     */
    Protocols.fromObject = function fromObject(d) {
        if (d instanceof $root.Protocols)
            return d;
        var m = new $root.Protocols();
        if (d.protocols) {
            if (!Array.isArray(d.protocols))
                throw TypeError(".Protocols.protocols: array expected");
            m.protocols = [];
            for (var i = 0; i < d.protocols.length; ++i) {
                m.protocols[i] = String(d.protocols[i]);
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a Protocols message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Protocols
     * @static
     * @param {Protocols} m Protocols
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Protocols.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.protocols = [];
        }
        if (m.protocols && m.protocols.length) {
            d.protocols = [];
            for (var j = 0; j < m.protocols.length; ++j) {
                d.protocols[j] = m.protocols[j];
            }
        }
        return d;
    };

    /**
     * Converts this Protocols to JSON.
     * @function toJSON
     * @memberof Protocols
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Protocols.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Protocols;
})();

module.exports = $root;
