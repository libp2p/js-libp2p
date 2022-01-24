/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-peer"] || ($protobuf.roots["libp2p-peer"] = {});

$root.Peer = (function() {

    /**
     * Properties of a Peer.
     * @exports IPeer
     * @interface IPeer
     * @property {Array.<IAddress>|null} [addresses] Peer addresses
     * @property {Array.<string>|null} [protocols] Peer protocols
     * @property {Array.<IMetadata>|null} [metadata] Peer metadata
     * @property {Uint8Array|null} [pubKey] Peer pubKey
     * @property {Uint8Array|null} [peerRecordEnvelope] Peer peerRecordEnvelope
     */

    /**
     * Constructs a new Peer.
     * @exports Peer
     * @classdesc Represents a Peer.
     * @implements IPeer
     * @constructor
     * @param {IPeer=} [p] Properties to set
     */
    function Peer(p) {
        this.addresses = [];
        this.protocols = [];
        this.metadata = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Peer addresses.
     * @member {Array.<IAddress>} addresses
     * @memberof Peer
     * @instance
     */
    Peer.prototype.addresses = $util.emptyArray;

    /**
     * Peer protocols.
     * @member {Array.<string>} protocols
     * @memberof Peer
     * @instance
     */
    Peer.prototype.protocols = $util.emptyArray;

    /**
     * Peer metadata.
     * @member {Array.<IMetadata>} metadata
     * @memberof Peer
     * @instance
     */
    Peer.prototype.metadata = $util.emptyArray;

    /**
     * Peer pubKey.
     * @member {Uint8Array|null|undefined} pubKey
     * @memberof Peer
     * @instance
     */
    Peer.prototype.pubKey = null;

    /**
     * Peer peerRecordEnvelope.
     * @member {Uint8Array|null|undefined} peerRecordEnvelope
     * @memberof Peer
     * @instance
     */
    Peer.prototype.peerRecordEnvelope = null;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * Peer _pubKey.
     * @member {"pubKey"|undefined} _pubKey
     * @memberof Peer
     * @instance
     */
    Object.defineProperty(Peer.prototype, "_pubKey", {
        get: $util.oneOfGetter($oneOfFields = ["pubKey"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Peer _peerRecordEnvelope.
     * @member {"peerRecordEnvelope"|undefined} _peerRecordEnvelope
     * @memberof Peer
     * @instance
     */
    Object.defineProperty(Peer.prototype, "_peerRecordEnvelope", {
        get: $util.oneOfGetter($oneOfFields = ["peerRecordEnvelope"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified Peer message. Does not implicitly {@link Peer.verify|verify} messages.
     * @function encode
     * @memberof Peer
     * @static
     * @param {IPeer} m Peer message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Peer.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.addresses != null && m.addresses.length) {
            for (var i = 0; i < m.addresses.length; ++i)
                $root.Address.encode(m.addresses[i], w.uint32(10).fork()).ldelim();
        }
        if (m.protocols != null && m.protocols.length) {
            for (var i = 0; i < m.protocols.length; ++i)
                w.uint32(18).string(m.protocols[i]);
        }
        if (m.metadata != null && m.metadata.length) {
            for (var i = 0; i < m.metadata.length; ++i)
                $root.Metadata.encode(m.metadata[i], w.uint32(26).fork()).ldelim();
        }
        if (m.pubKey != null && Object.hasOwnProperty.call(m, "pubKey"))
            w.uint32(34).bytes(m.pubKey);
        if (m.peerRecordEnvelope != null && Object.hasOwnProperty.call(m, "peerRecordEnvelope"))
            w.uint32(42).bytes(m.peerRecordEnvelope);
        return w;
    };

    /**
     * Decodes a Peer message from the specified reader or buffer.
     * @function decode
     * @memberof Peer
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Peer} Peer
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Peer.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Peer();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.addresses && m.addresses.length))
                    m.addresses = [];
                m.addresses.push($root.Address.decode(r, r.uint32()));
                break;
            case 2:
                if (!(m.protocols && m.protocols.length))
                    m.protocols = [];
                m.protocols.push(r.string());
                break;
            case 3:
                if (!(m.metadata && m.metadata.length))
                    m.metadata = [];
                m.metadata.push($root.Metadata.decode(r, r.uint32()));
                break;
            case 4:
                m.pubKey = r.bytes();
                break;
            case 5:
                m.peerRecordEnvelope = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Peer message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Peer
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Peer} Peer
     */
    Peer.fromObject = function fromObject(d) {
        if (d instanceof $root.Peer)
            return d;
        var m = new $root.Peer();
        if (d.addresses) {
            if (!Array.isArray(d.addresses))
                throw TypeError(".Peer.addresses: array expected");
            m.addresses = [];
            for (var i = 0; i < d.addresses.length; ++i) {
                if (typeof d.addresses[i] !== "object")
                    throw TypeError(".Peer.addresses: object expected");
                m.addresses[i] = $root.Address.fromObject(d.addresses[i]);
            }
        }
        if (d.protocols) {
            if (!Array.isArray(d.protocols))
                throw TypeError(".Peer.protocols: array expected");
            m.protocols = [];
            for (var i = 0; i < d.protocols.length; ++i) {
                m.protocols[i] = String(d.protocols[i]);
            }
        }
        if (d.metadata) {
            if (!Array.isArray(d.metadata))
                throw TypeError(".Peer.metadata: array expected");
            m.metadata = [];
            for (var i = 0; i < d.metadata.length; ++i) {
                if (typeof d.metadata[i] !== "object")
                    throw TypeError(".Peer.metadata: object expected");
                m.metadata[i] = $root.Metadata.fromObject(d.metadata[i]);
            }
        }
        if (d.pubKey != null) {
            if (typeof d.pubKey === "string")
                $util.base64.decode(d.pubKey, m.pubKey = $util.newBuffer($util.base64.length(d.pubKey)), 0);
            else if (d.pubKey.length)
                m.pubKey = d.pubKey;
        }
        if (d.peerRecordEnvelope != null) {
            if (typeof d.peerRecordEnvelope === "string")
                $util.base64.decode(d.peerRecordEnvelope, m.peerRecordEnvelope = $util.newBuffer($util.base64.length(d.peerRecordEnvelope)), 0);
            else if (d.peerRecordEnvelope.length)
                m.peerRecordEnvelope = d.peerRecordEnvelope;
        }
        return m;
    };

    /**
     * Creates a plain object from a Peer message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Peer
     * @static
     * @param {Peer} m Peer
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Peer.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.addresses = [];
            d.protocols = [];
            d.metadata = [];
        }
        if (m.addresses && m.addresses.length) {
            d.addresses = [];
            for (var j = 0; j < m.addresses.length; ++j) {
                d.addresses[j] = $root.Address.toObject(m.addresses[j], o);
            }
        }
        if (m.protocols && m.protocols.length) {
            d.protocols = [];
            for (var j = 0; j < m.protocols.length; ++j) {
                d.protocols[j] = m.protocols[j];
            }
        }
        if (m.metadata && m.metadata.length) {
            d.metadata = [];
            for (var j = 0; j < m.metadata.length; ++j) {
                d.metadata[j] = $root.Metadata.toObject(m.metadata[j], o);
            }
        }
        if (m.pubKey != null && m.hasOwnProperty("pubKey")) {
            d.pubKey = o.bytes === String ? $util.base64.encode(m.pubKey, 0, m.pubKey.length) : o.bytes === Array ? Array.prototype.slice.call(m.pubKey) : m.pubKey;
            if (o.oneofs)
                d._pubKey = "pubKey";
        }
        if (m.peerRecordEnvelope != null && m.hasOwnProperty("peerRecordEnvelope")) {
            d.peerRecordEnvelope = o.bytes === String ? $util.base64.encode(m.peerRecordEnvelope, 0, m.peerRecordEnvelope.length) : o.bytes === Array ? Array.prototype.slice.call(m.peerRecordEnvelope) : m.peerRecordEnvelope;
            if (o.oneofs)
                d._peerRecordEnvelope = "peerRecordEnvelope";
        }
        return d;
    };

    /**
     * Converts this Peer to JSON.
     * @function toJSON
     * @memberof Peer
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Peer.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Peer;
})();

$root.Address = (function() {

    /**
     * Properties of an Address.
     * @exports IAddress
     * @interface IAddress
     * @property {Uint8Array|null} [multiaddr] Address multiaddr
     * @property {boolean|null} [isCertified] Address isCertified
     */

    /**
     * Constructs a new Address.
     * @exports Address
     * @classdesc Represents an Address.
     * @implements IAddress
     * @constructor
     * @param {IAddress=} [p] Properties to set
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
     * @memberof Address
     * @instance
     */
    Address.prototype.multiaddr = $util.newBuffer([]);

    /**
     * Address isCertified.
     * @member {boolean|null|undefined} isCertified
     * @memberof Address
     * @instance
     */
    Address.prototype.isCertified = null;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * Address _isCertified.
     * @member {"isCertified"|undefined} _isCertified
     * @memberof Address
     * @instance
     */
    Object.defineProperty(Address.prototype, "_isCertified", {
        get: $util.oneOfGetter($oneOfFields = ["isCertified"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified Address message. Does not implicitly {@link Address.verify|verify} messages.
     * @function encode
     * @memberof Address
     * @static
     * @param {IAddress} m Address message or plain object to encode
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
     * @memberof Address
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Address} Address
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Address.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Address();
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
     * @memberof Address
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Address} Address
     */
    Address.fromObject = function fromObject(d) {
        if (d instanceof $root.Address)
            return d;
        var m = new $root.Address();
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
     * @memberof Address
     * @static
     * @param {Address} m Address
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
        }
        if (m.multiaddr != null && m.hasOwnProperty("multiaddr")) {
            d.multiaddr = o.bytes === String ? $util.base64.encode(m.multiaddr, 0, m.multiaddr.length) : o.bytes === Array ? Array.prototype.slice.call(m.multiaddr) : m.multiaddr;
        }
        if (m.isCertified != null && m.hasOwnProperty("isCertified")) {
            d.isCertified = m.isCertified;
            if (o.oneofs)
                d._isCertified = "isCertified";
        }
        return d;
    };

    /**
     * Converts this Address to JSON.
     * @function toJSON
     * @memberof Address
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Address.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Address;
})();

$root.Metadata = (function() {

    /**
     * Properties of a Metadata.
     * @exports IMetadata
     * @interface IMetadata
     * @property {string|null} [key] Metadata key
     * @property {Uint8Array|null} [value] Metadata value
     */

    /**
     * Constructs a new Metadata.
     * @exports Metadata
     * @classdesc Represents a Metadata.
     * @implements IMetadata
     * @constructor
     * @param {IMetadata=} [p] Properties to set
     */
    function Metadata(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Metadata key.
     * @member {string} key
     * @memberof Metadata
     * @instance
     */
    Metadata.prototype.key = "";

    /**
     * Metadata value.
     * @member {Uint8Array} value
     * @memberof Metadata
     * @instance
     */
    Metadata.prototype.value = $util.newBuffer([]);

    /**
     * Encodes the specified Metadata message. Does not implicitly {@link Metadata.verify|verify} messages.
     * @function encode
     * @memberof Metadata
     * @static
     * @param {IMetadata} m Metadata message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Metadata.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.key != null && Object.hasOwnProperty.call(m, "key"))
            w.uint32(10).string(m.key);
        if (m.value != null && Object.hasOwnProperty.call(m, "value"))
            w.uint32(18).bytes(m.value);
        return w;
    };

    /**
     * Decodes a Metadata message from the specified reader or buffer.
     * @function decode
     * @memberof Metadata
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Metadata} Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Metadata.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Metadata();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.key = r.string();
                break;
            case 2:
                m.value = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Metadata
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Metadata} Metadata
     */
    Metadata.fromObject = function fromObject(d) {
        if (d instanceof $root.Metadata)
            return d;
        var m = new $root.Metadata();
        if (d.key != null) {
            m.key = String(d.key);
        }
        if (d.value != null) {
            if (typeof d.value === "string")
                $util.base64.decode(d.value, m.value = $util.newBuffer($util.base64.length(d.value)), 0);
            else if (d.value.length)
                m.value = d.value;
        }
        return m;
    };

    /**
     * Creates a plain object from a Metadata message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Metadata
     * @static
     * @param {Metadata} m Metadata
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Metadata.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.key = "";
            if (o.bytes === String)
                d.value = "";
            else {
                d.value = [];
                if (o.bytes !== Array)
                    d.value = $util.newBuffer(d.value);
            }
        }
        if (m.key != null && m.hasOwnProperty("key")) {
            d.key = m.key;
        }
        if (m.value != null && m.hasOwnProperty("value")) {
            d.value = o.bytes === String ? $util.base64.encode(m.value, 0, m.value.length) : o.bytes === Array ? Array.prototype.slice.call(m.value) : m.value;
        }
        return d;
    };

    /**
     * Converts this Metadata to JSON.
     * @function toJSON
     * @memberof Metadata
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Metadata.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Metadata;
})();

module.exports = $root;
