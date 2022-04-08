/*eslint-disable*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["libp2p-identify"] || ($protobuf.roots["libp2p-identify"] = {});

export const Identify = $root.Identify = (() => {

    /**
     * Properties of an Identify.
     * @exports IIdentify
     * @interface IIdentify
     * @property {string|null} [protocolVersion] Identify protocolVersion
     * @property {string|null} [agentVersion] Identify agentVersion
     * @property {Uint8Array|null} [publicKey] Identify publicKey
     * @property {Array.<Uint8Array>|null} [listenAddrs] Identify listenAddrs
     * @property {Uint8Array|null} [observedAddr] Identify observedAddr
     * @property {Array.<string>|null} [protocols] Identify protocols
     * @property {Uint8Array|null} [signedPeerRecord] Identify signedPeerRecord
     */

    /**
     * Constructs a new Identify.
     * @exports Identify
     * @classdesc Represents an Identify.
     * @implements IIdentify
     * @constructor
     * @param {IIdentify=} [p] Properties to set
     */
    function Identify(p) {
        this.listenAddrs = [];
        this.protocols = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Identify protocolVersion.
     * @member {string|null|undefined} protocolVersion
     * @memberof Identify
     * @instance
     */
    Identify.prototype.protocolVersion = null;

    /**
     * Identify agentVersion.
     * @member {string|null|undefined} agentVersion
     * @memberof Identify
     * @instance
     */
    Identify.prototype.agentVersion = null;

    /**
     * Identify publicKey.
     * @member {Uint8Array|null|undefined} publicKey
     * @memberof Identify
     * @instance
     */
    Identify.prototype.publicKey = null;

    /**
     * Identify listenAddrs.
     * @member {Array.<Uint8Array>} listenAddrs
     * @memberof Identify
     * @instance
     */
    Identify.prototype.listenAddrs = $util.emptyArray;

    /**
     * Identify observedAddr.
     * @member {Uint8Array|null|undefined} observedAddr
     * @memberof Identify
     * @instance
     */
    Identify.prototype.observedAddr = null;

    /**
     * Identify protocols.
     * @member {Array.<string>} protocols
     * @memberof Identify
     * @instance
     */
    Identify.prototype.protocols = $util.emptyArray;

    /**
     * Identify signedPeerRecord.
     * @member {Uint8Array|null|undefined} signedPeerRecord
     * @memberof Identify
     * @instance
     */
    Identify.prototype.signedPeerRecord = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * Identify _protocolVersion.
     * @member {"protocolVersion"|undefined} _protocolVersion
     * @memberof Identify
     * @instance
     */
    Object.defineProperty(Identify.prototype, "_protocolVersion", {
        get: $util.oneOfGetter($oneOfFields = ["protocolVersion"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Identify _agentVersion.
     * @member {"agentVersion"|undefined} _agentVersion
     * @memberof Identify
     * @instance
     */
    Object.defineProperty(Identify.prototype, "_agentVersion", {
        get: $util.oneOfGetter($oneOfFields = ["agentVersion"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Identify _publicKey.
     * @member {"publicKey"|undefined} _publicKey
     * @memberof Identify
     * @instance
     */
    Object.defineProperty(Identify.prototype, "_publicKey", {
        get: $util.oneOfGetter($oneOfFields = ["publicKey"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Identify _observedAddr.
     * @member {"observedAddr"|undefined} _observedAddr
     * @memberof Identify
     * @instance
     */
    Object.defineProperty(Identify.prototype, "_observedAddr", {
        get: $util.oneOfGetter($oneOfFields = ["observedAddr"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Identify _signedPeerRecord.
     * @member {"signedPeerRecord"|undefined} _signedPeerRecord
     * @memberof Identify
     * @instance
     */
    Object.defineProperty(Identify.prototype, "_signedPeerRecord", {
        get: $util.oneOfGetter($oneOfFields = ["signedPeerRecord"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified Identify message. Does not implicitly {@link Identify.verify|verify} messages.
     * @function encode
     * @memberof Identify
     * @static
     * @param {IIdentify} m Identify message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Identify.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.publicKey != null && Object.hasOwnProperty.call(m, "publicKey"))
            w.uint32(10).bytes(m.publicKey);
        if (m.listenAddrs != null && m.listenAddrs.length) {
            for (var i = 0; i < m.listenAddrs.length; ++i)
                w.uint32(18).bytes(m.listenAddrs[i]);
        }
        if (m.protocols != null && m.protocols.length) {
            for (var i = 0; i < m.protocols.length; ++i)
                w.uint32(26).string(m.protocols[i]);
        }
        if (m.observedAddr != null && Object.hasOwnProperty.call(m, "observedAddr"))
            w.uint32(34).bytes(m.observedAddr);
        if (m.protocolVersion != null && Object.hasOwnProperty.call(m, "protocolVersion"))
            w.uint32(42).string(m.protocolVersion);
        if (m.agentVersion != null && Object.hasOwnProperty.call(m, "agentVersion"))
            w.uint32(50).string(m.agentVersion);
        if (m.signedPeerRecord != null && Object.hasOwnProperty.call(m, "signedPeerRecord"))
            w.uint32(66).bytes(m.signedPeerRecord);
        return w;
    };

    /**
     * Decodes an Identify message from the specified reader or buffer.
     * @function decode
     * @memberof Identify
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Identify} Identify
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Identify.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Identify();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 5:
                m.protocolVersion = r.string();
                break;
            case 6:
                m.agentVersion = r.string();
                break;
            case 1:
                m.publicKey = r.bytes();
                break;
            case 2:
                if (!(m.listenAddrs && m.listenAddrs.length))
                    m.listenAddrs = [];
                m.listenAddrs.push(r.bytes());
                break;
            case 4:
                m.observedAddr = r.bytes();
                break;
            case 3:
                if (!(m.protocols && m.protocols.length))
                    m.protocols = [];
                m.protocols.push(r.string());
                break;
            case 8:
                m.signedPeerRecord = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates an Identify message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Identify
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Identify} Identify
     */
    Identify.fromObject = function fromObject(d) {
        if (d instanceof $root.Identify)
            return d;
        var m = new $root.Identify();
        if (d.protocolVersion != null) {
            m.protocolVersion = String(d.protocolVersion);
        }
        if (d.agentVersion != null) {
            m.agentVersion = String(d.agentVersion);
        }
        if (d.publicKey != null) {
            if (typeof d.publicKey === "string")
                $util.base64.decode(d.publicKey, m.publicKey = $util.newBuffer($util.base64.length(d.publicKey)), 0);
            else if (d.publicKey.length)
                m.publicKey = d.publicKey;
        }
        if (d.listenAddrs) {
            if (!Array.isArray(d.listenAddrs))
                throw TypeError(".Identify.listenAddrs: array expected");
            m.listenAddrs = [];
            for (var i = 0; i < d.listenAddrs.length; ++i) {
                if (typeof d.listenAddrs[i] === "string")
                    $util.base64.decode(d.listenAddrs[i], m.listenAddrs[i] = $util.newBuffer($util.base64.length(d.listenAddrs[i])), 0);
                else if (d.listenAddrs[i].length)
                    m.listenAddrs[i] = d.listenAddrs[i];
            }
        }
        if (d.observedAddr != null) {
            if (typeof d.observedAddr === "string")
                $util.base64.decode(d.observedAddr, m.observedAddr = $util.newBuffer($util.base64.length(d.observedAddr)), 0);
            else if (d.observedAddr.length)
                m.observedAddr = d.observedAddr;
        }
        if (d.protocols) {
            if (!Array.isArray(d.protocols))
                throw TypeError(".Identify.protocols: array expected");
            m.protocols = [];
            for (var i = 0; i < d.protocols.length; ++i) {
                m.protocols[i] = String(d.protocols[i]);
            }
        }
        if (d.signedPeerRecord != null) {
            if (typeof d.signedPeerRecord === "string")
                $util.base64.decode(d.signedPeerRecord, m.signedPeerRecord = $util.newBuffer($util.base64.length(d.signedPeerRecord)), 0);
            else if (d.signedPeerRecord.length)
                m.signedPeerRecord = d.signedPeerRecord;
        }
        return m;
    };

    /**
     * Creates a plain object from an Identify message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Identify
     * @static
     * @param {Identify} m Identify
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Identify.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.listenAddrs = [];
            d.protocols = [];
        }
        if (m.publicKey != null && m.hasOwnProperty("publicKey")) {
            d.publicKey = o.bytes === String ? $util.base64.encode(m.publicKey, 0, m.publicKey.length) : o.bytes === Array ? Array.prototype.slice.call(m.publicKey) : m.publicKey;
            if (o.oneofs)
                d._publicKey = "publicKey";
        }
        if (m.listenAddrs && m.listenAddrs.length) {
            d.listenAddrs = [];
            for (var j = 0; j < m.listenAddrs.length; ++j) {
                d.listenAddrs[j] = o.bytes === String ? $util.base64.encode(m.listenAddrs[j], 0, m.listenAddrs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.listenAddrs[j]) : m.listenAddrs[j];
            }
        }
        if (m.protocols && m.protocols.length) {
            d.protocols = [];
            for (var j = 0; j < m.protocols.length; ++j) {
                d.protocols[j] = m.protocols[j];
            }
        }
        if (m.observedAddr != null && m.hasOwnProperty("observedAddr")) {
            d.observedAddr = o.bytes === String ? $util.base64.encode(m.observedAddr, 0, m.observedAddr.length) : o.bytes === Array ? Array.prototype.slice.call(m.observedAddr) : m.observedAddr;
            if (o.oneofs)
                d._observedAddr = "observedAddr";
        }
        if (m.protocolVersion != null && m.hasOwnProperty("protocolVersion")) {
            d.protocolVersion = m.protocolVersion;
            if (o.oneofs)
                d._protocolVersion = "protocolVersion";
        }
        if (m.agentVersion != null && m.hasOwnProperty("agentVersion")) {
            d.agentVersion = m.agentVersion;
            if (o.oneofs)
                d._agentVersion = "agentVersion";
        }
        if (m.signedPeerRecord != null && m.hasOwnProperty("signedPeerRecord")) {
            d.signedPeerRecord = o.bytes === String ? $util.base64.encode(m.signedPeerRecord, 0, m.signedPeerRecord.length) : o.bytes === Array ? Array.prototype.slice.call(m.signedPeerRecord) : m.signedPeerRecord;
            if (o.oneofs)
                d._signedPeerRecord = "signedPeerRecord";
        }
        return d;
    };

    /**
     * Converts this Identify to JSON.
     * @function toJSON
     * @memberof Identify
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Identify.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Identify;
})();

export { $root as default };
