/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-peer-record"] || ($protobuf.roots["libp2p-peer-record"] = {});

$root.PeerRecord = (function() {

    /**
     * Properties of a PeerRecord.
     * @exports IPeerRecord
     * @interface IPeerRecord
     * @property {Uint8Array|null} [peerId] PeerRecord peerId
     * @property {number|null} [seq] PeerRecord seq
     * @property {Array.<PeerRecord.IAddressInfo>|null} [addresses] PeerRecord addresses
     */

    /**
     * Constructs a new PeerRecord.
     * @exports PeerRecord
     * @classdesc Represents a PeerRecord.
     * @implements IPeerRecord
     * @constructor
     * @param {IPeerRecord=} [p] Properties to set
     */
    function PeerRecord(p) {
        this.addresses = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * PeerRecord peerId.
     * @member {Uint8Array} peerId
     * @memberof PeerRecord
     * @instance
     */
    PeerRecord.prototype.peerId = $util.newBuffer([]);

    /**
     * PeerRecord seq.
     * @member {number} seq
     * @memberof PeerRecord
     * @instance
     */
    PeerRecord.prototype.seq = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * PeerRecord addresses.
     * @member {Array.<PeerRecord.IAddressInfo>} addresses
     * @memberof PeerRecord
     * @instance
     */
    PeerRecord.prototype.addresses = $util.emptyArray;

    /**
     * Encodes the specified PeerRecord message. Does not implicitly {@link PeerRecord.verify|verify} messages.
     * @function encode
     * @memberof PeerRecord
     * @static
     * @param {IPeerRecord} m PeerRecord message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PeerRecord.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.peerId != null && Object.hasOwnProperty.call(m, "peerId"))
            w.uint32(10).bytes(m.peerId);
        if (m.seq != null && Object.hasOwnProperty.call(m, "seq"))
            w.uint32(16).uint64(m.seq);
        if (m.addresses != null && m.addresses.length) {
            for (var i = 0; i < m.addresses.length; ++i)
                $root.PeerRecord.AddressInfo.encode(m.addresses[i], w.uint32(26).fork()).ldelim();
        }
        return w;
    };

    /**
     * Decodes a PeerRecord message from the specified reader or buffer.
     * @function decode
     * @memberof PeerRecord
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {PeerRecord} PeerRecord
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PeerRecord.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.PeerRecord();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.peerId = r.bytes();
                break;
            case 2:
                m.seq = r.uint64();
                break;
            case 3:
                if (!(m.addresses && m.addresses.length))
                    m.addresses = [];
                m.addresses.push($root.PeerRecord.AddressInfo.decode(r, r.uint32()));
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a PeerRecord message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PeerRecord
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {PeerRecord} PeerRecord
     */
    PeerRecord.fromObject = function fromObject(d) {
        if (d instanceof $root.PeerRecord)
            return d;
        var m = new $root.PeerRecord();
        if (d.peerId != null) {
            if (typeof d.peerId === "string")
                $util.base64.decode(d.peerId, m.peerId = $util.newBuffer($util.base64.length(d.peerId)), 0);
            else if (d.peerId.length)
                m.peerId = d.peerId;
        }
        if (d.seq != null) {
            if ($util.Long)
                (m.seq = $util.Long.fromValue(d.seq)).unsigned = true;
            else if (typeof d.seq === "string")
                m.seq = parseInt(d.seq, 10);
            else if (typeof d.seq === "number")
                m.seq = d.seq;
            else if (typeof d.seq === "object")
                m.seq = new $util.LongBits(d.seq.low >>> 0, d.seq.high >>> 0).toNumber(true);
        }
        if (d.addresses) {
            if (!Array.isArray(d.addresses))
                throw TypeError(".PeerRecord.addresses: array expected");
            m.addresses = [];
            for (var i = 0; i < d.addresses.length; ++i) {
                if (typeof d.addresses[i] !== "object")
                    throw TypeError(".PeerRecord.addresses: object expected");
                m.addresses[i] = $root.PeerRecord.AddressInfo.fromObject(d.addresses[i]);
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a PeerRecord message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PeerRecord
     * @static
     * @param {PeerRecord} m PeerRecord
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PeerRecord.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.addresses = [];
        }
        if (o.defaults) {
            if (o.bytes === String)
                d.peerId = "";
            else {
                d.peerId = [];
                if (o.bytes !== Array)
                    d.peerId = $util.newBuffer(d.peerId);
            }
            if ($util.Long) {
                var n = new $util.Long(0, 0, true);
                d.seq = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
            } else
                d.seq = o.longs === String ? "0" : 0;
        }
        if (m.peerId != null && m.hasOwnProperty("peerId")) {
            d.peerId = o.bytes === String ? $util.base64.encode(m.peerId, 0, m.peerId.length) : o.bytes === Array ? Array.prototype.slice.call(m.peerId) : m.peerId;
        }
        if (m.seq != null && m.hasOwnProperty("seq")) {
            if (typeof m.seq === "number")
                d.seq = o.longs === String ? String(m.seq) : m.seq;
            else
                d.seq = o.longs === String ? $util.Long.prototype.toString.call(m.seq) : o.longs === Number ? new $util.LongBits(m.seq.low >>> 0, m.seq.high >>> 0).toNumber(true) : m.seq;
        }
        if (m.addresses && m.addresses.length) {
            d.addresses = [];
            for (var j = 0; j < m.addresses.length; ++j) {
                d.addresses[j] = $root.PeerRecord.AddressInfo.toObject(m.addresses[j], o);
            }
        }
        return d;
    };

    /**
     * Converts this PeerRecord to JSON.
     * @function toJSON
     * @memberof PeerRecord
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PeerRecord.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    PeerRecord.AddressInfo = (function() {

        /**
         * Properties of an AddressInfo.
         * @memberof PeerRecord
         * @interface IAddressInfo
         * @property {Uint8Array|null} [multiaddr] AddressInfo multiaddr
         */

        /**
         * Constructs a new AddressInfo.
         * @memberof PeerRecord
         * @classdesc Represents an AddressInfo.
         * @implements IAddressInfo
         * @constructor
         * @param {PeerRecord.IAddressInfo=} [p] Properties to set
         */
        function AddressInfo(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * AddressInfo multiaddr.
         * @member {Uint8Array} multiaddr
         * @memberof PeerRecord.AddressInfo
         * @instance
         */
        AddressInfo.prototype.multiaddr = $util.newBuffer([]);

        /**
         * Encodes the specified AddressInfo message. Does not implicitly {@link PeerRecord.AddressInfo.verify|verify} messages.
         * @function encode
         * @memberof PeerRecord.AddressInfo
         * @static
         * @param {PeerRecord.IAddressInfo} m AddressInfo message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddressInfo.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.multiaddr != null && Object.hasOwnProperty.call(m, "multiaddr"))
                w.uint32(10).bytes(m.multiaddr);
            return w;
        };

        /**
         * Decodes an AddressInfo message from the specified reader or buffer.
         * @function decode
         * @memberof PeerRecord.AddressInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {PeerRecord.AddressInfo} AddressInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddressInfo.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.PeerRecord.AddressInfo();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.multiaddr = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Creates an AddressInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof PeerRecord.AddressInfo
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {PeerRecord.AddressInfo} AddressInfo
         */
        AddressInfo.fromObject = function fromObject(d) {
            if (d instanceof $root.PeerRecord.AddressInfo)
                return d;
            var m = new $root.PeerRecord.AddressInfo();
            if (d.multiaddr != null) {
                if (typeof d.multiaddr === "string")
                    $util.base64.decode(d.multiaddr, m.multiaddr = $util.newBuffer($util.base64.length(d.multiaddr)), 0);
                else if (d.multiaddr.length)
                    m.multiaddr = d.multiaddr;
            }
            return m;
        };

        /**
         * Creates a plain object from an AddressInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof PeerRecord.AddressInfo
         * @static
         * @param {PeerRecord.AddressInfo} m AddressInfo
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AddressInfo.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (o.defaults) {
                if (o.bytes === String)
                    d.multiaddr = "";
                else {
                    d.multiaddr = [];
                    if (o.bytes !== Array)
                        d.multiaddr = $util.newBuffer(d.multiaddr);
                }
            }
            if (m.multiaddr != null && m.hasOwnProperty("multiaddr")) {
                d.multiaddr = o.bytes === String ? $util.base64.encode(m.multiaddr, 0, m.multiaddr.length) : o.bytes === Array ? Array.prototype.slice.call(m.multiaddr) : m.multiaddr;
            }
            return d;
        };

        /**
         * Converts this AddressInfo to JSON.
         * @function toJSON
         * @memberof PeerRecord.AddressInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AddressInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return AddressInfo;
    })();

    return PeerRecord;
})();

module.exports = $root;
