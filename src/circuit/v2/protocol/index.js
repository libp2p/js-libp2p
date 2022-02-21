/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-circuit"] || ($protobuf.roots["libp2p-circuit"] = {});

$root.HopMessage = (function() {

    /**
     * Properties of a HopMessage.
     * @exports IHopMessage
     * @interface IHopMessage
     * @property {HopMessage.Type} type HopMessage type
     * @property {IPeer|null} [peer] HopMessage peer
     * @property {IReservation|null} [reservation] HopMessage reservation
     * @property {ILimit|null} [limit] HopMessage limit
     * @property {Status|null} [status] HopMessage status
     */

    /**
     * Constructs a new HopMessage.
     * @exports HopMessage
     * @classdesc Represents a HopMessage.
     * @implements IHopMessage
     * @constructor
     * @param {IHopMessage=} [p] Properties to set
     */
    function HopMessage(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * HopMessage type.
     * @member {HopMessage.Type} type
     * @memberof HopMessage
     * @instance
     */
    HopMessage.prototype.type = 0;

    /**
     * HopMessage peer.
     * @member {IPeer|null|undefined} peer
     * @memberof HopMessage
     * @instance
     */
    HopMessage.prototype.peer = null;

    /**
     * HopMessage reservation.
     * @member {IReservation|null|undefined} reservation
     * @memberof HopMessage
     * @instance
     */
    HopMessage.prototype.reservation = null;

    /**
     * HopMessage limit.
     * @member {ILimit|null|undefined} limit
     * @memberof HopMessage
     * @instance
     */
    HopMessage.prototype.limit = null;

    /**
     * HopMessage status.
     * @member {Status} status
     * @memberof HopMessage
     * @instance
     */
    HopMessage.prototype.status = 100;

    /**
     * Encodes the specified HopMessage message. Does not implicitly {@link HopMessage.verify|verify} messages.
     * @function encode
     * @memberof HopMessage
     * @static
     * @param {IHopMessage} m HopMessage message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    HopMessage.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(8).int32(m.type);
        if (m.peer != null && Object.hasOwnProperty.call(m, "peer"))
            $root.Peer.encode(m.peer, w.uint32(18).fork()).ldelim();
        if (m.reservation != null && Object.hasOwnProperty.call(m, "reservation"))
            $root.Reservation.encode(m.reservation, w.uint32(26).fork()).ldelim();
        if (m.limit != null && Object.hasOwnProperty.call(m, "limit"))
            $root.Limit.encode(m.limit, w.uint32(34).fork()).ldelim();
        if (m.status != null && Object.hasOwnProperty.call(m, "status"))
            w.uint32(40).int32(m.status);
        return w;
    };

    /**
     * Decodes a HopMessage message from the specified reader or buffer.
     * @function decode
     * @memberof HopMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {HopMessage} HopMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    HopMessage.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.HopMessage();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.type = r.int32();
                break;
            case 2:
                m.peer = $root.Peer.decode(r, r.uint32());
                break;
            case 3:
                m.reservation = $root.Reservation.decode(r, r.uint32());
                break;
            case 4:
                m.limit = $root.Limit.decode(r, r.uint32());
                break;
            case 5:
                m.status = r.int32();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("type"))
            throw $util.ProtocolError("missing required 'type'", { instance: m });
        return m;
    };

    /**
     * Creates a HopMessage message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof HopMessage
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {HopMessage} HopMessage
     */
    HopMessage.fromObject = function fromObject(d) {
        if (d instanceof $root.HopMessage)
            return d;
        var m = new $root.HopMessage();
        switch (d.type) {
        case "RESERVE":
        case 0:
            m.type = 0;
            break;
        case "CONNECT":
        case 1:
            m.type = 1;
            break;
        case "STATUS":
        case 2:
            m.type = 2;
            break;
        }
        if (d.peer != null) {
            if (typeof d.peer !== "object")
                throw TypeError(".HopMessage.peer: object expected");
            m.peer = $root.Peer.fromObject(d.peer);
        }
        if (d.reservation != null) {
            if (typeof d.reservation !== "object")
                throw TypeError(".HopMessage.reservation: object expected");
            m.reservation = $root.Reservation.fromObject(d.reservation);
        }
        if (d.limit != null) {
            if (typeof d.limit !== "object")
                throw TypeError(".HopMessage.limit: object expected");
            m.limit = $root.Limit.fromObject(d.limit);
        }
        switch (d.status) {
        case "OK":
        case 100:
            m.status = 100;
            break;
        case "RESERVATION_REFUSED":
        case 200:
            m.status = 200;
            break;
        case "RESOURCE_LIMIT_EXCEEDED":
        case 201:
            m.status = 201;
            break;
        case "PERMISSION_DENIED":
        case 202:
            m.status = 202;
            break;
        case "CONNECTION_FAILED":
        case 203:
            m.status = 203;
            break;
        case "NO_RESERVATION":
        case 204:
            m.status = 204;
            break;
        case "MALFORMED_MESSAGE":
        case 400:
            m.status = 400;
            break;
        case "UNEXPECTED_MESSAGE":
        case 401:
            m.status = 401;
            break;
        }
        return m;
    };

    /**
     * Creates a plain object from a HopMessage message. Also converts values to other types if specified.
     * @function toObject
     * @memberof HopMessage
     * @static
     * @param {HopMessage} m HopMessage
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    HopMessage.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.type = o.enums === String ? "RESERVE" : 0;
            d.peer = null;
            d.reservation = null;
            d.limit = null;
            d.status = o.enums === String ? "OK" : 100;
        }
        if (m.type != null && m.hasOwnProperty("type")) {
            d.type = o.enums === String ? $root.HopMessage.Type[m.type] : m.type;
        }
        if (m.peer != null && m.hasOwnProperty("peer")) {
            d.peer = $root.Peer.toObject(m.peer, o);
        }
        if (m.reservation != null && m.hasOwnProperty("reservation")) {
            d.reservation = $root.Reservation.toObject(m.reservation, o);
        }
        if (m.limit != null && m.hasOwnProperty("limit")) {
            d.limit = $root.Limit.toObject(m.limit, o);
        }
        if (m.status != null && m.hasOwnProperty("status")) {
            d.status = o.enums === String ? $root.Status[m.status] : m.status;
        }
        return d;
    };

    /**
     * Converts this HopMessage to JSON.
     * @function toJSON
     * @memberof HopMessage
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    HopMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Type enum.
     * @name HopMessage.Type
     * @enum {number}
     * @property {number} RESERVE=0 RESERVE value
     * @property {number} CONNECT=1 CONNECT value
     * @property {number} STATUS=2 STATUS value
     */
    HopMessage.Type = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "RESERVE"] = 0;
        values[valuesById[1] = "CONNECT"] = 1;
        values[valuesById[2] = "STATUS"] = 2;
        return values;
    })();

    return HopMessage;
})();

$root.StopMessage = (function() {

    /**
     * Properties of a StopMessage.
     * @exports IStopMessage
     * @interface IStopMessage
     * @property {StopMessage.Type} type StopMessage type
     * @property {IPeer|null} [peer] StopMessage peer
     * @property {ILimit|null} [limit] StopMessage limit
     * @property {Status|null} [status] StopMessage status
     */

    /**
     * Constructs a new StopMessage.
     * @exports StopMessage
     * @classdesc Represents a StopMessage.
     * @implements IStopMessage
     * @constructor
     * @param {IStopMessage=} [p] Properties to set
     */
    function StopMessage(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * StopMessage type.
     * @member {StopMessage.Type} type
     * @memberof StopMessage
     * @instance
     */
    StopMessage.prototype.type = 0;

    /**
     * StopMessage peer.
     * @member {IPeer|null|undefined} peer
     * @memberof StopMessage
     * @instance
     */
    StopMessage.prototype.peer = null;

    /**
     * StopMessage limit.
     * @member {ILimit|null|undefined} limit
     * @memberof StopMessage
     * @instance
     */
    StopMessage.prototype.limit = null;

    /**
     * StopMessage status.
     * @member {Status} status
     * @memberof StopMessage
     * @instance
     */
    StopMessage.prototype.status = 100;

    /**
     * Encodes the specified StopMessage message. Does not implicitly {@link StopMessage.verify|verify} messages.
     * @function encode
     * @memberof StopMessage
     * @static
     * @param {IStopMessage} m StopMessage message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StopMessage.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(8).int32(m.type);
        if (m.peer != null && Object.hasOwnProperty.call(m, "peer"))
            $root.Peer.encode(m.peer, w.uint32(18).fork()).ldelim();
        if (m.limit != null && Object.hasOwnProperty.call(m, "limit"))
            $root.Limit.encode(m.limit, w.uint32(26).fork()).ldelim();
        if (m.status != null && Object.hasOwnProperty.call(m, "status"))
            w.uint32(32).int32(m.status);
        return w;
    };

    /**
     * Decodes a StopMessage message from the specified reader or buffer.
     * @function decode
     * @memberof StopMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {StopMessage} StopMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StopMessage.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.StopMessage();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.type = r.int32();
                break;
            case 2:
                m.peer = $root.Peer.decode(r, r.uint32());
                break;
            case 3:
                m.limit = $root.Limit.decode(r, r.uint32());
                break;
            case 4:
                m.status = r.int32();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("type"))
            throw $util.ProtocolError("missing required 'type'", { instance: m });
        return m;
    };

    /**
     * Creates a StopMessage message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof StopMessage
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {StopMessage} StopMessage
     */
    StopMessage.fromObject = function fromObject(d) {
        if (d instanceof $root.StopMessage)
            return d;
        var m = new $root.StopMessage();
        switch (d.type) {
        case "CONNECT":
        case 0:
            m.type = 0;
            break;
        case "STATUS":
        case 1:
            m.type = 1;
            break;
        }
        if (d.peer != null) {
            if (typeof d.peer !== "object")
                throw TypeError(".StopMessage.peer: object expected");
            m.peer = $root.Peer.fromObject(d.peer);
        }
        if (d.limit != null) {
            if (typeof d.limit !== "object")
                throw TypeError(".StopMessage.limit: object expected");
            m.limit = $root.Limit.fromObject(d.limit);
        }
        switch (d.status) {
        case "OK":
        case 100:
            m.status = 100;
            break;
        case "RESERVATION_REFUSED":
        case 200:
            m.status = 200;
            break;
        case "RESOURCE_LIMIT_EXCEEDED":
        case 201:
            m.status = 201;
            break;
        case "PERMISSION_DENIED":
        case 202:
            m.status = 202;
            break;
        case "CONNECTION_FAILED":
        case 203:
            m.status = 203;
            break;
        case "NO_RESERVATION":
        case 204:
            m.status = 204;
            break;
        case "MALFORMED_MESSAGE":
        case 400:
            m.status = 400;
            break;
        case "UNEXPECTED_MESSAGE":
        case 401:
            m.status = 401;
            break;
        }
        return m;
    };

    /**
     * Creates a plain object from a StopMessage message. Also converts values to other types if specified.
     * @function toObject
     * @memberof StopMessage
     * @static
     * @param {StopMessage} m StopMessage
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StopMessage.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.type = o.enums === String ? "CONNECT" : 0;
            d.peer = null;
            d.limit = null;
            d.status = o.enums === String ? "OK" : 100;
        }
        if (m.type != null && m.hasOwnProperty("type")) {
            d.type = o.enums === String ? $root.StopMessage.Type[m.type] : m.type;
        }
        if (m.peer != null && m.hasOwnProperty("peer")) {
            d.peer = $root.Peer.toObject(m.peer, o);
        }
        if (m.limit != null && m.hasOwnProperty("limit")) {
            d.limit = $root.Limit.toObject(m.limit, o);
        }
        if (m.status != null && m.hasOwnProperty("status")) {
            d.status = o.enums === String ? $root.Status[m.status] : m.status;
        }
        return d;
    };

    /**
     * Converts this StopMessage to JSON.
     * @function toJSON
     * @memberof StopMessage
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    StopMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Type enum.
     * @name StopMessage.Type
     * @enum {number}
     * @property {number} CONNECT=0 CONNECT value
     * @property {number} STATUS=1 STATUS value
     */
    StopMessage.Type = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "CONNECT"] = 0;
        values[valuesById[1] = "STATUS"] = 1;
        return values;
    })();

    return StopMessage;
})();

$root.Peer = (function() {

    /**
     * Properties of a Peer.
     * @exports IPeer
     * @interface IPeer
     * @property {Uint8Array} id Peer id
     * @property {Array.<Uint8Array>|null} [addrs] Peer addrs
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
        this.addrs = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Peer id.
     * @member {Uint8Array} id
     * @memberof Peer
     * @instance
     */
    Peer.prototype.id = $util.newBuffer([]);

    /**
     * Peer addrs.
     * @member {Array.<Uint8Array>} addrs
     * @memberof Peer
     * @instance
     */
    Peer.prototype.addrs = $util.emptyArray;

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
     * @memberof Peer
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Peer} Peer
     */
    Peer.fromObject = function fromObject(d) {
        if (d instanceof $root.Peer)
            return d;
        var m = new $root.Peer();
        if (d.id != null) {
            if (typeof d.id === "string")
                $util.base64.decode(d.id, m.id = $util.newBuffer($util.base64.length(d.id)), 0);
            else if (d.id.length)
                m.id = d.id;
        }
        if (d.addrs) {
            if (!Array.isArray(d.addrs))
                throw TypeError(".Peer.addrs: array expected");
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
     * @memberof Peer
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Peer.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Peer;
})();

$root.Reservation = (function() {

    /**
     * Properties of a Reservation.
     * @exports IReservation
     * @interface IReservation
     * @property {number} expire Reservation expire
     * @property {Array.<Uint8Array>|null} [addrs] Reservation addrs
     * @property {Uint8Array|null} [voucher] Reservation voucher
     */

    /**
     * Constructs a new Reservation.
     * @exports Reservation
     * @classdesc Represents a Reservation.
     * @implements IReservation
     * @constructor
     * @param {IReservation=} [p] Properties to set
     */
    function Reservation(p) {
        this.addrs = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Reservation expire.
     * @member {number} expire
     * @memberof Reservation
     * @instance
     */
    Reservation.prototype.expire = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Reservation addrs.
     * @member {Array.<Uint8Array>} addrs
     * @memberof Reservation
     * @instance
     */
    Reservation.prototype.addrs = $util.emptyArray;

    /**
     * Reservation voucher.
     * @member {Uint8Array} voucher
     * @memberof Reservation
     * @instance
     */
    Reservation.prototype.voucher = $util.newBuffer([]);

    /**
     * Encodes the specified Reservation message. Does not implicitly {@link Reservation.verify|verify} messages.
     * @function encode
     * @memberof Reservation
     * @static
     * @param {IReservation} m Reservation message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Reservation.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(8).uint64(m.expire);
        if (m.addrs != null && m.addrs.length) {
            for (var i = 0; i < m.addrs.length; ++i)
                w.uint32(18).bytes(m.addrs[i]);
        }
        if (m.voucher != null && Object.hasOwnProperty.call(m, "voucher"))
            w.uint32(26).bytes(m.voucher);
        return w;
    };

    /**
     * Decodes a Reservation message from the specified reader or buffer.
     * @function decode
     * @memberof Reservation
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Reservation} Reservation
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Reservation.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Reservation();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.expire = r.uint64();
                break;
            case 2:
                if (!(m.addrs && m.addrs.length))
                    m.addrs = [];
                m.addrs.push(r.bytes());
                break;
            case 3:
                m.voucher = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("expire"))
            throw $util.ProtocolError("missing required 'expire'", { instance: m });
        return m;
    };

    /**
     * Creates a Reservation message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Reservation
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Reservation} Reservation
     */
    Reservation.fromObject = function fromObject(d) {
        if (d instanceof $root.Reservation)
            return d;
        var m = new $root.Reservation();
        if (d.expire != null) {
            if ($util.Long)
                (m.expire = $util.Long.fromValue(d.expire)).unsigned = true;
            else if (typeof d.expire === "string")
                m.expire = parseInt(d.expire, 10);
            else if (typeof d.expire === "number")
                m.expire = d.expire;
            else if (typeof d.expire === "object")
                m.expire = new $util.LongBits(d.expire.low >>> 0, d.expire.high >>> 0).toNumber(true);
        }
        if (d.addrs) {
            if (!Array.isArray(d.addrs))
                throw TypeError(".Reservation.addrs: array expected");
            m.addrs = [];
            for (var i = 0; i < d.addrs.length; ++i) {
                if (typeof d.addrs[i] === "string")
                    $util.base64.decode(d.addrs[i], m.addrs[i] = $util.newBuffer($util.base64.length(d.addrs[i])), 0);
                else if (d.addrs[i].length)
                    m.addrs[i] = d.addrs[i];
            }
        }
        if (d.voucher != null) {
            if (typeof d.voucher === "string")
                $util.base64.decode(d.voucher, m.voucher = $util.newBuffer($util.base64.length(d.voucher)), 0);
            else if (d.voucher.length)
                m.voucher = d.voucher;
        }
        return m;
    };

    /**
     * Creates a plain object from a Reservation message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Reservation
     * @static
     * @param {Reservation} m Reservation
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Reservation.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.addrs = [];
        }
        if (o.defaults) {
            if ($util.Long) {
                var n = new $util.Long(0, 0, true);
                d.expire = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
            } else
                d.expire = o.longs === String ? "0" : 0;
            if (o.bytes === String)
                d.voucher = "";
            else {
                d.voucher = [];
                if (o.bytes !== Array)
                    d.voucher = $util.newBuffer(d.voucher);
            }
        }
        if (m.expire != null && m.hasOwnProperty("expire")) {
            if (typeof m.expire === "number")
                d.expire = o.longs === String ? String(m.expire) : m.expire;
            else
                d.expire = o.longs === String ? $util.Long.prototype.toString.call(m.expire) : o.longs === Number ? new $util.LongBits(m.expire.low >>> 0, m.expire.high >>> 0).toNumber(true) : m.expire;
        }
        if (m.addrs && m.addrs.length) {
            d.addrs = [];
            for (var j = 0; j < m.addrs.length; ++j) {
                d.addrs[j] = o.bytes === String ? $util.base64.encode(m.addrs[j], 0, m.addrs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.addrs[j]) : m.addrs[j];
            }
        }
        if (m.voucher != null && m.hasOwnProperty("voucher")) {
            d.voucher = o.bytes === String ? $util.base64.encode(m.voucher, 0, m.voucher.length) : o.bytes === Array ? Array.prototype.slice.call(m.voucher) : m.voucher;
        }
        return d;
    };

    /**
     * Converts this Reservation to JSON.
     * @function toJSON
     * @memberof Reservation
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Reservation.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Reservation;
})();

$root.Limit = (function() {

    /**
     * Properties of a Limit.
     * @exports ILimit
     * @interface ILimit
     * @property {number|null} [duration] Limit duration
     * @property {number|null} [data] Limit data
     */

    /**
     * Constructs a new Limit.
     * @exports Limit
     * @classdesc Represents a Limit.
     * @implements ILimit
     * @constructor
     * @param {ILimit=} [p] Properties to set
     */
    function Limit(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Limit duration.
     * @member {number} duration
     * @memberof Limit
     * @instance
     */
    Limit.prototype.duration = 0;

    /**
     * Limit data.
     * @member {number} data
     * @memberof Limit
     * @instance
     */
    Limit.prototype.data = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Encodes the specified Limit message. Does not implicitly {@link Limit.verify|verify} messages.
     * @function encode
     * @memberof Limit
     * @static
     * @param {ILimit} m Limit message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Limit.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.duration != null && Object.hasOwnProperty.call(m, "duration"))
            w.uint32(8).uint32(m.duration);
        if (m.data != null && Object.hasOwnProperty.call(m, "data"))
            w.uint32(16).uint64(m.data);
        return w;
    };

    /**
     * Decodes a Limit message from the specified reader or buffer.
     * @function decode
     * @memberof Limit
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Limit} Limit
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Limit.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Limit();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.duration = r.uint32();
                break;
            case 2:
                m.data = r.uint64();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Limit message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Limit
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Limit} Limit
     */
    Limit.fromObject = function fromObject(d) {
        if (d instanceof $root.Limit)
            return d;
        var m = new $root.Limit();
        if (d.duration != null) {
            m.duration = d.duration >>> 0;
        }
        if (d.data != null) {
            if ($util.Long)
                (m.data = $util.Long.fromValue(d.data)).unsigned = true;
            else if (typeof d.data === "string")
                m.data = parseInt(d.data, 10);
            else if (typeof d.data === "number")
                m.data = d.data;
            else if (typeof d.data === "object")
                m.data = new $util.LongBits(d.data.low >>> 0, d.data.high >>> 0).toNumber(true);
        }
        return m;
    };

    /**
     * Creates a plain object from a Limit message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Limit
     * @static
     * @param {Limit} m Limit
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Limit.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.duration = 0;
            if ($util.Long) {
                var n = new $util.Long(0, 0, true);
                d.data = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
            } else
                d.data = o.longs === String ? "0" : 0;
        }
        if (m.duration != null && m.hasOwnProperty("duration")) {
            d.duration = m.duration;
        }
        if (m.data != null && m.hasOwnProperty("data")) {
            if (typeof m.data === "number")
                d.data = o.longs === String ? String(m.data) : m.data;
            else
                d.data = o.longs === String ? $util.Long.prototype.toString.call(m.data) : o.longs === Number ? new $util.LongBits(m.data.low >>> 0, m.data.high >>> 0).toNumber(true) : m.data;
        }
        return d;
    };

    /**
     * Converts this Limit to JSON.
     * @function toJSON
     * @memberof Limit
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Limit.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Limit;
})();

/**
 * Status enum.
 * @exports Status
 * @enum {number}
 * @property {number} OK=100 OK value
 * @property {number} RESERVATION_REFUSED=200 RESERVATION_REFUSED value
 * @property {number} RESOURCE_LIMIT_EXCEEDED=201 RESOURCE_LIMIT_EXCEEDED value
 * @property {number} PERMISSION_DENIED=202 PERMISSION_DENIED value
 * @property {number} CONNECTION_FAILED=203 CONNECTION_FAILED value
 * @property {number} NO_RESERVATION=204 NO_RESERVATION value
 * @property {number} MALFORMED_MESSAGE=400 MALFORMED_MESSAGE value
 * @property {number} UNEXPECTED_MESSAGE=401 UNEXPECTED_MESSAGE value
 */
$root.Status = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[100] = "OK"] = 100;
    values[valuesById[200] = "RESERVATION_REFUSED"] = 200;
    values[valuesById[201] = "RESOURCE_LIMIT_EXCEEDED"] = 201;
    values[valuesById[202] = "PERMISSION_DENIED"] = 202;
    values[valuesById[203] = "CONNECTION_FAILED"] = 203;
    values[valuesById[204] = "NO_RESERVATION"] = 204;
    values[valuesById[400] = "MALFORMED_MESSAGE"] = 400;
    values[valuesById[401] = "UNEXPECTED_MESSAGE"] = 401;
    return values;
})();

$root.ReservationVoucher = (function() {

    /**
     * Properties of a ReservationVoucher.
     * @exports IReservationVoucher
     * @interface IReservationVoucher
     * @property {Uint8Array} relay ReservationVoucher relay
     * @property {Uint8Array} peer ReservationVoucher peer
     * @property {number} expiration ReservationVoucher expiration
     */

    /**
     * Constructs a new ReservationVoucher.
     * @exports ReservationVoucher
     * @classdesc Represents a ReservationVoucher.
     * @implements IReservationVoucher
     * @constructor
     * @param {IReservationVoucher=} [p] Properties to set
     */
    function ReservationVoucher(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ReservationVoucher relay.
     * @member {Uint8Array} relay
     * @memberof ReservationVoucher
     * @instance
     */
    ReservationVoucher.prototype.relay = $util.newBuffer([]);

    /**
     * ReservationVoucher peer.
     * @member {Uint8Array} peer
     * @memberof ReservationVoucher
     * @instance
     */
    ReservationVoucher.prototype.peer = $util.newBuffer([]);

    /**
     * ReservationVoucher expiration.
     * @member {number} expiration
     * @memberof ReservationVoucher
     * @instance
     */
    ReservationVoucher.prototype.expiration = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Encodes the specified ReservationVoucher message. Does not implicitly {@link ReservationVoucher.verify|verify} messages.
     * @function encode
     * @memberof ReservationVoucher
     * @static
     * @param {IReservationVoucher} m ReservationVoucher message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ReservationVoucher.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        w.uint32(10).bytes(m.relay);
        w.uint32(18).bytes(m.peer);
        w.uint32(24).uint64(m.expiration);
        return w;
    };

    /**
     * Decodes a ReservationVoucher message from the specified reader or buffer.
     * @function decode
     * @memberof ReservationVoucher
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ReservationVoucher} ReservationVoucher
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ReservationVoucher.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ReservationVoucher();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.relay = r.bytes();
                break;
            case 2:
                m.peer = r.bytes();
                break;
            case 3:
                m.expiration = r.uint64();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        if (!m.hasOwnProperty("relay"))
            throw $util.ProtocolError("missing required 'relay'", { instance: m });
        if (!m.hasOwnProperty("peer"))
            throw $util.ProtocolError("missing required 'peer'", { instance: m });
        if (!m.hasOwnProperty("expiration"))
            throw $util.ProtocolError("missing required 'expiration'", { instance: m });
        return m;
    };

    /**
     * Creates a ReservationVoucher message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ReservationVoucher
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ReservationVoucher} ReservationVoucher
     */
    ReservationVoucher.fromObject = function fromObject(d) {
        if (d instanceof $root.ReservationVoucher)
            return d;
        var m = new $root.ReservationVoucher();
        if (d.relay != null) {
            if (typeof d.relay === "string")
                $util.base64.decode(d.relay, m.relay = $util.newBuffer($util.base64.length(d.relay)), 0);
            else if (d.relay.length)
                m.relay = d.relay;
        }
        if (d.peer != null) {
            if (typeof d.peer === "string")
                $util.base64.decode(d.peer, m.peer = $util.newBuffer($util.base64.length(d.peer)), 0);
            else if (d.peer.length)
                m.peer = d.peer;
        }
        if (d.expiration != null) {
            if ($util.Long)
                (m.expiration = $util.Long.fromValue(d.expiration)).unsigned = true;
            else if (typeof d.expiration === "string")
                m.expiration = parseInt(d.expiration, 10);
            else if (typeof d.expiration === "number")
                m.expiration = d.expiration;
            else if (typeof d.expiration === "object")
                m.expiration = new $util.LongBits(d.expiration.low >>> 0, d.expiration.high >>> 0).toNumber(true);
        }
        return m;
    };

    /**
     * Creates a plain object from a ReservationVoucher message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ReservationVoucher
     * @static
     * @param {ReservationVoucher} m ReservationVoucher
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ReservationVoucher.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            if (o.bytes === String)
                d.relay = "";
            else {
                d.relay = [];
                if (o.bytes !== Array)
                    d.relay = $util.newBuffer(d.relay);
            }
            if (o.bytes === String)
                d.peer = "";
            else {
                d.peer = [];
                if (o.bytes !== Array)
                    d.peer = $util.newBuffer(d.peer);
            }
            if ($util.Long) {
                var n = new $util.Long(0, 0, true);
                d.expiration = o.longs === String ? n.toString() : o.longs === Number ? n.toNumber() : n;
            } else
                d.expiration = o.longs === String ? "0" : 0;
        }
        if (m.relay != null && m.hasOwnProperty("relay")) {
            d.relay = o.bytes === String ? $util.base64.encode(m.relay, 0, m.relay.length) : o.bytes === Array ? Array.prototype.slice.call(m.relay) : m.relay;
        }
        if (m.peer != null && m.hasOwnProperty("peer")) {
            d.peer = o.bytes === String ? $util.base64.encode(m.peer, 0, m.peer.length) : o.bytes === Array ? Array.prototype.slice.call(m.peer) : m.peer;
        }
        if (m.expiration != null && m.hasOwnProperty("expiration")) {
            if (typeof m.expiration === "number")
                d.expiration = o.longs === String ? String(m.expiration) : m.expiration;
            else
                d.expiration = o.longs === String ? $util.Long.prototype.toString.call(m.expiration) : o.longs === Number ? new $util.LongBits(m.expiration.low >>> 0, m.expiration.high >>> 0).toNumber(true) : m.expiration;
        }
        return d;
    };

    /**
     * Converts this ReservationVoucher to JSON.
     * @function toJSON
     * @memberof ReservationVoucher
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ReservationVoucher.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ReservationVoucher;
})();

module.exports = $root;
