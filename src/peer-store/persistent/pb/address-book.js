/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-address-book"] || ($protobuf.roots["libp2p-address-book"] = {});

$root.Addresses = (function() {

    /**
     * Properties of an Addresses.
     * @exports IAddresses
     * @interface IAddresses
     * @property {Array.<Addresses.IAddress>|null} [addrs] Addresses addrs
     * @property {Addresses.ICertifiedRecord|null} [certifiedRecord] Addresses certifiedRecord
     */

    /**
     * Constructs a new Addresses.
     * @exports Addresses
     * @classdesc Represents an Addresses.
     * @implements IAddresses
     * @constructor
     * @param {IAddresses=} [p] Properties to set
     */
    function Addresses(p) {
        this.addrs = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Addresses addrs.
     * @member {Array.<Addresses.IAddress>} addrs
     * @memberof Addresses
     * @instance
     */
    Addresses.prototype.addrs = $util.emptyArray;

    /**
     * Addresses certifiedRecord.
     * @member {Addresses.ICertifiedRecord|null|undefined} certifiedRecord
     * @memberof Addresses
     * @instance
     */
    Addresses.prototype.certifiedRecord = null;

    /**
     * Encodes the specified Addresses message. Does not implicitly {@link Addresses.verify|verify} messages.
     * @function encode
     * @memberof Addresses
     * @static
     * @param {IAddresses} m Addresses message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Addresses.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.addrs != null && m.addrs.length) {
            for (var i = 0; i < m.addrs.length; ++i)
                $root.Addresses.Address.encode(m.addrs[i], w.uint32(10).fork()).ldelim();
        }
        if (m.certifiedRecord != null && Object.hasOwnProperty.call(m, "certifiedRecord"))
            $root.Addresses.CertifiedRecord.encode(m.certifiedRecord, w.uint32(18).fork()).ldelim();
        return w;
    };

    /**
     * Decodes an Addresses message from the specified reader or buffer.
     * @function decode
     * @memberof Addresses
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Addresses} Addresses
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Addresses.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Addresses();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.addrs && m.addrs.length))
                    m.addrs = [];
                m.addrs.push($root.Addresses.Address.decode(r, r.uint32()));
                break;
            case 2:
                m.certifiedRecord = $root.Addresses.CertifiedRecord.decode(r, r.uint32());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates an Addresses message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Addresses
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Addresses} Addresses
     */
    Addresses.fromObject = function fromObject(d) {
        if (d instanceof $root.Addresses)
            return d;
        var m = new $root.Addresses();
        if (d.addrs) {
            if (!Array.isArray(d.addrs))
                throw TypeError(".Addresses.addrs: array expected");
            m.addrs = [];
            for (var i = 0; i < d.addrs.length; ++i) {
                if (typeof d.addrs[i] !== "object")
                    throw TypeError(".Addresses.addrs: object expected");
                m.addrs[i] = $root.Addresses.Address.fromObject(d.addrs[i]);
            }
        }
        if (d.certifiedRecord != null) {
            if (typeof d.certifiedRecord !== "object")
                throw TypeError(".Addresses.certifiedRecord: object expected");
            m.certifiedRecord = $root.Addresses.CertifiedRecord.fromObject(d.certifiedRecord);
        }
        return m;
    };

    /**
     * Creates a plain object from an Addresses message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Addresses
     * @static
     * @param {Addresses} m Addresses
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Addresses.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.addrs = [];
        }
        if (o.defaults) {
            d.certifiedRecord = null;
        }
        if (m.addrs && m.addrs.length) {
            d.addrs = [];
            for (var j = 0; j < m.addrs.length; ++j) {
                d.addrs[j] = $root.Addresses.Address.toObject(m.addrs[j], o);
            }
        }
        if (m.certifiedRecord != null && m.hasOwnProperty("certifiedRecord")) {
            d.certifiedRecord = $root.Addresses.CertifiedRecord.toObject(m.certifiedRecord, o);
        }
        return d;
    };

    /**
     * Converts this Addresses to JSON.
     * @function toJSON
     * @memberof Addresses
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Addresses.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    Addresses.Address = (function() {

        /**
         * Properties of an Address.
         * @memberof Addresses
         * @interface IAddress
         * @property {Uint8Array|null} [multiaddr] Address multiaddr
         * @property {boolean|null} [isCertified] Address isCertified
         */

        /**
         * Constructs a new Address.
         * @memberof Addresses
         * @classdesc Represents an Address.
         * @implements IAddress
         * @constructor
         * @param {Addresses.IAddress=} [p] Properties to set
         */
        function Address(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Address multiaddr.
         * @member {Uint8Array} multiaddr
         * @memberof Addresses.Address
         * @instance
         */
        Address.prototype.multiaddr = $util.newBuffer([]);

        /**
         * Address isCertified.
         * @member {boolean} isCertified
         * @memberof Addresses.Address
         * @instance
         */
        Address.prototype.isCertified = false;

        /**
         * Encodes the specified Address message. Does not implicitly {@link Addresses.Address.verify|verify} messages.
         * @function encode
         * @memberof Addresses.Address
         * @static
         * @param {Addresses.IAddress} m Address message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Address.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.multiaddr != null && Object.hasOwnProperty.call(m, "multiaddr"))
                w.uint32(10).bytes(m.multiaddr);
            if (m.isCertified != null && Object.hasOwnProperty.call(m, "isCertified"))
                w.uint32(16).bool(m.isCertified);
            return w;
        };

        /**
         * Decodes an Address message from the specified reader or buffer.
         * @function decode
         * @memberof Addresses.Address
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {Addresses.Address} Address
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Address.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.Addresses.Address();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.multiaddr = r.bytes();
                    break;
                case 2:
                    m.isCertified = r.bool();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Creates an Address message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof Addresses.Address
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {Addresses.Address} Address
         */
        Address.fromObject = function fromObject(d) {
            if (d instanceof $root.Addresses.Address)
                return d;
            var m = new $root.Addresses.Address();
            if (d.multiaddr != null) {
                if (typeof d.multiaddr === "string")
                    $util.base64.decode(d.multiaddr, m.multiaddr = $util.newBuffer($util.base64.length(d.multiaddr)), 0);
                else if (d.multiaddr.length)
                    m.multiaddr = d.multiaddr;
            }
            if (d.isCertified != null) {
                m.isCertified = Boolean(d.isCertified);
            }
            return m;
        };

        /**
         * Creates a plain object from an Address message. Also converts values to other types if specified.
         * @function toObject
         * @memberof Addresses.Address
         * @static
         * @param {Addresses.Address} m Address
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Address.toObject = function toObject(m, o) {
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
                d.isCertified = false;
            }
            if (m.multiaddr != null && m.hasOwnProperty("multiaddr")) {
                d.multiaddr = o.bytes === String ? $util.base64.encode(m.multiaddr, 0, m.multiaddr.length) : o.bytes === Array ? Array.prototype.slice.call(m.multiaddr) : m.multiaddr;
            }
            if (m.isCertified != null && m.hasOwnProperty("isCertified")) {
                d.isCertified = m.isCertified;
            }
            return d;
        };

        /**
         * Converts this Address to JSON.
         * @function toJSON
         * @memberof Addresses.Address
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Address.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Address;
    })();

    Addresses.CertifiedRecord = (function() {

        /**
         * Properties of a CertifiedRecord.
         * @memberof Addresses
         * @interface ICertifiedRecord
         * @property {number|null} [seq] CertifiedRecord seq
         * @property {Uint8Array|null} [raw] CertifiedRecord raw
         */

        /**
         * Constructs a new CertifiedRecord.
         * @memberof Addresses
         * @classdesc Represents a CertifiedRecord.
         * @implements ICertifiedRecord
         * @constructor
         * @param {Addresses.ICertifiedRecord=} [p] Properties to set
         */
        function CertifiedRecord(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * CertifiedRecord seq.
         * @member {number} seq
         * @memberof Addresses.CertifiedRecord
         * @instance
         */
        CertifiedRecord.prototype.seq = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * CertifiedRecord raw.
         * @member {Uint8Array} raw
         * @memberof Addresses.CertifiedRecord
         * @instance
         */
        CertifiedRecord.prototype.raw = $util.newBuffer([]);

        /**
         * Encodes the specified CertifiedRecord message. Does not implicitly {@link Addresses.CertifiedRecord.verify|verify} messages.
         * @function encode
         * @memberof Addresses.CertifiedRecord
         * @static
         * @param {Addresses.ICertifiedRecord} m CertifiedRecord message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CertifiedRecord.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.seq != null && Object.hasOwnProperty.call(m, "seq"))
                w.uint32(8).uint64(m.seq);
            if (m.raw != null && Object.hasOwnProperty.call(m, "raw"))
                w.uint32(18).bytes(m.raw);
            return w;
        };

        /**
         * Decodes a CertifiedRecord message from the specified reader or buffer.
         * @function decode
         * @memberof Addresses.CertifiedRecord
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {Addresses.CertifiedRecord} CertifiedRecord
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CertifiedRecord.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.Addresses.CertifiedRecord();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.seq = r.uint64();
                    break;
                case 2:
                    m.raw = r.bytes();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Creates a CertifiedRecord message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof Addresses.CertifiedRecord
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {Addresses.CertifiedRecord} CertifiedRecord
         */
        CertifiedRecord.fromObject = function fromObject(d) {
            if (d instanceof $root.Addresses.CertifiedRecord)
                return d;
            var m = new $root.Addresses.CertifiedRecord();
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
            if (d.raw != null) {
                if (typeof d.raw === "string")
                    $util.base64.decode(d.raw, m.raw = $util.newBuffer($util.base64.length(d.raw)), 0);
                else if (d.raw.length)
                    m.raw = d.raw;
            }
            return m;
        };

        /**
         * Creates a plain object from a CertifiedRecord message. Also converts values to other types if specified.
         * @function toObject
         * @memberof Addresses.CertifiedRecord
         * @static
         * @param {Addresses.CertifiedRecord} m CertifiedRecord
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CertifiedRecord.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (o.defaults) {
                if ($util.Long) {
                    var n = new $util.Long(0, 0, true);
                    d.seq = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
                } else
                    d.seq = o.longs === String ? "0" : 0;
                if (o.bytes === String)
                    d.raw = "";
                else {
                    d.raw = [];
                    if (o.bytes !== Array)
                        d.raw = $util.newBuffer(d.raw);
                }
            }
            if (m.seq != null && m.hasOwnProperty("seq")) {
                if (typeof m.seq === "number")
                    d.seq = o.longs === String ? String(m.seq) : m.seq;
                else
                    d.seq = o.longs === String ? $util.Long.prototype.toString.call(m.seq) : o.longs === Number ? new $util.LongBits(m.seq.low >>> 0, m.seq.high >>> 0).toNumber(true) : m.seq;
            }
            if (m.raw != null && m.hasOwnProperty("raw")) {
                d.raw = o.bytes === String ? $util.base64.encode(m.raw, 0, m.raw.length) : o.bytes === Array ? Array.prototype.slice.call(m.raw) : m.raw;
            }
            return d;
        };

        /**
         * Converts this CertifiedRecord to JSON.
         * @function toJSON
         * @memberof Addresses.CertifiedRecord
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CertifiedRecord.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return CertifiedRecord;
    })();

    return Addresses;
})();

module.exports = $root;
