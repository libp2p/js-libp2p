/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-circuit"] || ($protobuf.roots["libp2p-circuit"] = {});

$root.CircuitRelay = (function() {

    /**
     * Properties of a CircuitRelay.
     * @exports ICircuitRelay
     * @interface ICircuitRelay
     * @property {CircuitRelay.Type|null} [type] CircuitRelay type
     * @property {CircuitRelay.IPeer|null} [srcPeer] CircuitRelay srcPeer
     * @property {CircuitRelay.IPeer|null} [dstPeer] CircuitRelay dstPeer
     * @property {CircuitRelay.Status|null} [code] CircuitRelay code
     */

    /**
     * Constructs a new CircuitRelay.
     * @exports CircuitRelay
     * @classdesc Represents a CircuitRelay.
     * @implements ICircuitRelay
     * @constructor
     * @param {ICircuitRelay=} [p] Properties to set
     */
    function CircuitRelay(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * CircuitRelay type.
     * @member {CircuitRelay.Type} type
     * @memberof CircuitRelay
     * @instance
     */
    CircuitRelay.prototype.type = 1;

    /**
     * CircuitRelay srcPeer.
     * @member {CircuitRelay.IPeer|null|undefined} srcPeer
     * @memberof CircuitRelay
     * @instance
     */
    CircuitRelay.prototype.srcPeer = null;

    /**
     * CircuitRelay dstPeer.
     * @member {CircuitRelay.IPeer|null|undefined} dstPeer
     * @memberof CircuitRelay
     * @instance
     */
    CircuitRelay.prototype.dstPeer = null;

    /**
     * CircuitRelay code.
     * @member {CircuitRelay.Status} code
     * @memberof CircuitRelay
     * @instance
     */
    CircuitRelay.prototype.code = 100;

    /**
     * Encodes the specified CircuitRelay message. Does not implicitly {@link CircuitRelay.verify|verify} messages.
     * @function encode
     * @memberof CircuitRelay
     * @static
     * @param {ICircuitRelay} m CircuitRelay message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CircuitRelay.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.type != null && Object.hasOwnProperty.call(m, "type"))
            w.uint32(8).int32(m.type);
        if (m.srcPeer != null && Object.hasOwnProperty.call(m, "srcPeer"))
            $root.CircuitRelay.Peer.encode(m.srcPeer, w.uint32(18).fork()).ldelim();
        if (m.dstPeer != null && Object.hasOwnProperty.call(m, "dstPeer"))
            $root.CircuitRelay.Peer.encode(m.dstPeer, w.uint32(26).fork()).ldelim();
        if (m.code != null && Object.hasOwnProperty.call(m, "code"))
            w.uint32(32).int32(m.code);
        return w;
    };

    /**
     * Decodes a CircuitRelay message from the specified reader or buffer.
     * @function decode
     * @memberof CircuitRelay
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {CircuitRelay} CircuitRelay
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CircuitRelay.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.CircuitRelay();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.type = r.int32();
                break;
            case 2:
                m.srcPeer = $root.CircuitRelay.Peer.decode(r, r.uint32());
                break;
            case 3:
                m.dstPeer = $root.CircuitRelay.Peer.decode(r, r.uint32());
                break;
            case 4:
                m.code = r.int32();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a CircuitRelay message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CircuitRelay
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {CircuitRelay} CircuitRelay
     */
    CircuitRelay.fromObject = function fromObject(d) {
        if (d instanceof $root.CircuitRelay)
            return d;
        var m = new $root.CircuitRelay();
        switch (d.type) {
        case "HOP":
        case 1:
            m.type = 1;
            break;
        case "STOP":
        case 2:
            m.type = 2;
            break;
        case "STATUS":
        case 3:
            m.type = 3;
            break;
        case "CAN_HOP":
        case 4:
            m.type = 4;
            break;
        }
        if (d.srcPeer != null) {
            if (typeof d.srcPeer !== "object")
                throw TypeError(".CircuitRelay.srcPeer: object expected");
            m.srcPeer = $root.CircuitRelay.Peer.fromObject(d.srcPeer);
        }
        if (d.dstPeer != null) {
            if (typeof d.dstPeer !== "object")
                throw TypeError(".CircuitRelay.dstPeer: object expected");
            m.dstPeer = $root.CircuitRelay.Peer.fromObject(d.dstPeer);
        }
        switch (d.code) {
        case "SUCCESS":
        case 100:
            m.code = 100;
            break;
        case "HOP_SRC_ADDR_TOO_LONG":
        case 220:
            m.code = 220;
            break;
        case "HOP_DST_ADDR_TOO_LONG":
        case 221:
            m.code = 221;
            break;
        case "HOP_SRC_MULTIADDR_INVALID":
        case 250:
            m.code = 250;
            break;
        case "HOP_DST_MULTIADDR_INVALID":
        case 251:
            m.code = 251;
            break;
        case "HOP_NO_CONN_TO_DST":
        case 260:
            m.code = 260;
            break;
        case "HOP_CANT_DIAL_DST":
        case 261:
            m.code = 261;
            break;
        case "HOP_CANT_OPEN_DST_STREAM":
        case 262:
            m.code = 262;
            break;
        case "HOP_CANT_SPEAK_RELAY":
        case 270:
            m.code = 270;
            break;
        case "HOP_CANT_RELAY_TO_SELF":
        case 280:
            m.code = 280;
            break;
        case "STOP_SRC_ADDR_TOO_LONG":
        case 320:
            m.code = 320;
            break;
        case "STOP_DST_ADDR_TOO_LONG":
        case 321:
            m.code = 321;
            break;
        case "STOP_SRC_MULTIADDR_INVALID":
        case 350:
            m.code = 350;
            break;
        case "STOP_DST_MULTIADDR_INVALID":
        case 351:
            m.code = 351;
            break;
        case "STOP_RELAY_REFUSED":
        case 390:
            m.code = 390;
            break;
        case "MALFORMED_MESSAGE":
        case 400:
            m.code = 400;
            break;
        }
        return m;
    };

    /**
     * Creates a plain object from a CircuitRelay message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CircuitRelay
     * @static
     * @param {CircuitRelay} m CircuitRelay
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CircuitRelay.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.type = o.enums === String ? "HOP" : 1;
            d.srcPeer = null;
            d.dstPeer = null;
            d.code = o.enums === String ? "SUCCESS" : 100;
        }
        if (m.type != null && m.hasOwnProperty("type")) {
            d.type = o.enums === String ? $root.CircuitRelay.Type[m.type] : m.type;
        }
        if (m.srcPeer != null && m.hasOwnProperty("srcPeer")) {
            d.srcPeer = $root.CircuitRelay.Peer.toObject(m.srcPeer, o);
        }
        if (m.dstPeer != null && m.hasOwnProperty("dstPeer")) {
            d.dstPeer = $root.CircuitRelay.Peer.toObject(m.dstPeer, o);
        }
        if (m.code != null && m.hasOwnProperty("code")) {
            d.code = o.enums === String ? $root.CircuitRelay.Status[m.code] : m.code;
        }
        return d;
    };

    /**
     * Converts this CircuitRelay to JSON.
     * @function toJSON
     * @memberof CircuitRelay
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CircuitRelay.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Status enum.
     * @name CircuitRelay.Status
     * @enum {number}
     * @property {number} SUCCESS=100 SUCCESS value
     * @property {number} HOP_SRC_ADDR_TOO_LONG=220 HOP_SRC_ADDR_TOO_LONG value
     * @property {number} HOP_DST_ADDR_TOO_LONG=221 HOP_DST_ADDR_TOO_LONG value
     * @property {number} HOP_SRC_MULTIADDR_INVALID=250 HOP_SRC_MULTIADDR_INVALID value
     * @property {number} HOP_DST_MULTIADDR_INVALID=251 HOP_DST_MULTIADDR_INVALID value
     * @property {number} HOP_NO_CONN_TO_DST=260 HOP_NO_CONN_TO_DST value
     * @property {number} HOP_CANT_DIAL_DST=261 HOP_CANT_DIAL_DST value
     * @property {number} HOP_CANT_OPEN_DST_STREAM=262 HOP_CANT_OPEN_DST_STREAM value
     * @property {number} HOP_CANT_SPEAK_RELAY=270 HOP_CANT_SPEAK_RELAY value
     * @property {number} HOP_CANT_RELAY_TO_SELF=280 HOP_CANT_RELAY_TO_SELF value
     * @property {number} STOP_SRC_ADDR_TOO_LONG=320 STOP_SRC_ADDR_TOO_LONG value
     * @property {number} STOP_DST_ADDR_TOO_LONG=321 STOP_DST_ADDR_TOO_LONG value
     * @property {number} STOP_SRC_MULTIADDR_INVALID=350 STOP_SRC_MULTIADDR_INVALID value
     * @property {number} STOP_DST_MULTIADDR_INVALID=351 STOP_DST_MULTIADDR_INVALID value
     * @property {number} STOP_RELAY_REFUSED=390 STOP_RELAY_REFUSED value
     * @property {number} MALFORMED_MESSAGE=400 MALFORMED_MESSAGE value
     */
    CircuitRelay.Status = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[100] = "SUCCESS"] = 100;
        values[valuesById[220] = "HOP_SRC_ADDR_TOO_LONG"] = 220;
        values[valuesById[221] = "HOP_DST_ADDR_TOO_LONG"] = 221;
        values[valuesById[250] = "HOP_SRC_MULTIADDR_INVALID"] = 250;
        values[valuesById[251] = "HOP_DST_MULTIADDR_INVALID"] = 251;
        values[valuesById[260] = "HOP_NO_CONN_TO_DST"] = 260;
        values[valuesById[261] = "HOP_CANT_DIAL_DST"] = 261;
        values[valuesById[262] = "HOP_CANT_OPEN_DST_STREAM"] = 262;
        values[valuesById[270] = "HOP_CANT_SPEAK_RELAY"] = 270;
        values[valuesById[280] = "HOP_CANT_RELAY_TO_SELF"] = 280;
        values[valuesById[320] = "STOP_SRC_ADDR_TOO_LONG"] = 320;
        values[valuesById[321] = "STOP_DST_ADDR_TOO_LONG"] = 321;
        values[valuesById[350] = "STOP_SRC_MULTIADDR_INVALID"] = 350;
        values[valuesById[351] = "STOP_DST_MULTIADDR_INVALID"] = 351;
        values[valuesById[390] = "STOP_RELAY_REFUSED"] = 390;
        values[valuesById[400] = "MALFORMED_MESSAGE"] = 400;
        return values;
    })();

    /**
     * Type enum.
     * @name CircuitRelay.Type
     * @enum {number}
     * @property {number} HOP=1 HOP value
     * @property {number} STOP=2 STOP value
     * @property {number} STATUS=3 STATUS value
     * @property {number} CAN_HOP=4 CAN_HOP value
     */
    CircuitRelay.Type = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[1] = "HOP"] = 1;
        values[valuesById[2] = "STOP"] = 2;
        values[valuesById[3] = "STATUS"] = 3;
        values[valuesById[4] = "CAN_HOP"] = 4;
        return values;
    })();

    CircuitRelay.Peer = (function() {

        /**
         * Properties of a Peer.
         * @memberof CircuitRelay
         * @interface IPeer
         * @property {Uint8Array} id Peer id
         * @property {Array.<Uint8Array>|null} [addrs] Peer addrs
         */

        /**
         * Constructs a new Peer.
         * @memberof CircuitRelay
         * @classdesc Represents a Peer.
         * @implements IPeer
         * @constructor
         * @param {CircuitRelay.IPeer=} [p] Properties to set
         */
        function Peer(p) {
            this.addrs = [];
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Peer id.
         * @member {Uint8Array} id
         * @memberof CircuitRelay.Peer
         * @instance
         */
        Peer.prototype.id = $util.newBuffer([]);

        /**
         * Peer addrs.
         * @member {Array.<Uint8Array>} addrs
         * @memberof CircuitRelay.Peer
         * @instance
         */
        Peer.prototype.addrs = $util.emptyArray;

        /**
         * Encodes the specified Peer message. Does not implicitly {@link CircuitRelay.Peer.verify|verify} messages.
         * @function encode
         * @memberof CircuitRelay.Peer
         * @static
         * @param {CircuitRelay.IPeer} m Peer message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peer.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            w.uint32(10).bytes(m.id);
            if (m.addrs != null && m.addrs.length) {
                for (var i = 0; i < m.addrs.length; ++i)
                    w.uint32(18).bytes(m.addrs[i]);
            }
            return w;
        };

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @function decode
         * @memberof CircuitRelay.Peer
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {CircuitRelay.Peer} Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peer.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.CircuitRelay.Peer();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.id = r.bytes();
                    break;
                case 2:
                    if (!(m.addrs && m.addrs.length))
                        m.addrs = [];
                    m.addrs.push(r.bytes());
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            if (!m.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: m });
            return m;
        };

        /**
         * Creates a Peer message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof CircuitRelay.Peer
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {CircuitRelay.Peer} Peer
         */
        Peer.fromObject = function fromObject(d) {
            if (d instanceof $root.CircuitRelay.Peer)
                return d;
            var m = new $root.CircuitRelay.Peer();
            if (d.id != null) {
                if (typeof d.id === "string")
                    $util.base64.decode(d.id, m.id = $util.newBuffer($util.base64.length(d.id)), 0);
                else if (d.id.length)
                    m.id = d.id;
            }
            if (d.addrs) {
                if (!Array.isArray(d.addrs))
                    throw TypeError(".CircuitRelay.Peer.addrs: array expected");
                m.addrs = [];
                for (var i = 0; i < d.addrs.length; ++i) {
                    if (typeof d.addrs[i] === "string")
                        $util.base64.decode(d.addrs[i], m.addrs[i] = $util.newBuffer($util.base64.length(d.addrs[i])), 0);
                    else if (d.addrs[i].length)
                        m.addrs[i] = d.addrs[i];
                }
            }
            return m;
        };

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @function toObject
         * @memberof CircuitRelay.Peer
         * @static
         * @param {CircuitRelay.Peer} m Peer
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Peer.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (o.arrays || o.defaults) {
                d.addrs = [];
            }
            if (o.defaults) {
                if (o.bytes === String)
                    d.id = "";
                else {
                    d.id = [];
                    if (o.bytes !== Array)
                        d.id = $util.newBuffer(d.id);
                }
            }
            if (m.id != null && m.hasOwnProperty("id")) {
                d.id = o.bytes === String ? $util.base64.encode(m.id, 0, m.id.length) : o.bytes === Array ? Array.prototype.slice.call(m.id) : m.id;
            }
            if (m.addrs && m.addrs.length) {
                d.addrs = [];
                for (var j = 0; j < m.addrs.length; ++j) {
                    d.addrs[j] = o.bytes === String ? $util.base64.encode(m.addrs[j], 0, m.addrs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.addrs[j]) : m.addrs[j];
                }
            }
            return d;
        };

        /**
         * Converts this Peer to JSON.
         * @function toJSON
         * @memberof CircuitRelay.Peer
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Peer.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Peer;
    })();

    return CircuitRelay;
})();

module.exports = $root;
