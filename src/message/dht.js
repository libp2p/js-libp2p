/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-dht-message"] || ($protobuf.roots["libp2p-dht-message"] = {});

$root.Record = (function() {

    /**
     * Properties of a Record.
     * @exports IRecord
     * @interface IRecord
     * @property {Uint8Array|null} [key] Record key
     * @property {Uint8Array|null} [value] Record value
     * @property {Uint8Array|null} [author] Record author
     * @property {Uint8Array|null} [signature] Record signature
     * @property {string|null} [timeReceived] Record timeReceived
     */

    /**
     * Constructs a new Record.
     * @exports Record
     * @classdesc Represents a Record.
     * @implements IRecord
     * @constructor
     * @param {IRecord=} [p] Properties to set
     */
    function Record(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Record key.
     * @member {Uint8Array|null|undefined} key
     * @memberof Record
     * @instance
     */
    Record.prototype.key = null;

    /**
     * Record value.
     * @member {Uint8Array|null|undefined} value
     * @memberof Record
     * @instance
     */
    Record.prototype.value = null;

    /**
     * Record author.
     * @member {Uint8Array|null|undefined} author
     * @memberof Record
     * @instance
     */
    Record.prototype.author = null;

    /**
     * Record signature.
     * @member {Uint8Array|null|undefined} signature
     * @memberof Record
     * @instance
     */
    Record.prototype.signature = null;

    /**
     * Record timeReceived.
     * @member {string|null|undefined} timeReceived
     * @memberof Record
     * @instance
     */
    Record.prototype.timeReceived = null;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * Record _key.
     * @member {"key"|undefined} _key
     * @memberof Record
     * @instance
     */
    Object.defineProperty(Record.prototype, "_key", {
        get: $util.oneOfGetter($oneOfFields = ["key"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Record _value.
     * @member {"value"|undefined} _value
     * @memberof Record
     * @instance
     */
    Object.defineProperty(Record.prototype, "_value", {
        get: $util.oneOfGetter($oneOfFields = ["value"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Record _author.
     * @member {"author"|undefined} _author
     * @memberof Record
     * @instance
     */
    Object.defineProperty(Record.prototype, "_author", {
        get: $util.oneOfGetter($oneOfFields = ["author"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Record _signature.
     * @member {"signature"|undefined} _signature
     * @memberof Record
     * @instance
     */
    Object.defineProperty(Record.prototype, "_signature", {
        get: $util.oneOfGetter($oneOfFields = ["signature"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Record _timeReceived.
     * @member {"timeReceived"|undefined} _timeReceived
     * @memberof Record
     * @instance
     */
    Object.defineProperty(Record.prototype, "_timeReceived", {
        get: $util.oneOfGetter($oneOfFields = ["timeReceived"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified Record message. Does not implicitly {@link Record.verify|verify} messages.
     * @function encode
     * @memberof Record
     * @static
     * @param {IRecord} m Record message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Record.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.key != null && Object.hasOwnProperty.call(m, "key"))
            w.uint32(10).bytes(m.key);
        if (m.value != null && Object.hasOwnProperty.call(m, "value"))
            w.uint32(18).bytes(m.value);
        if (m.author != null && Object.hasOwnProperty.call(m, "author"))
            w.uint32(26).bytes(m.author);
        if (m.signature != null && Object.hasOwnProperty.call(m, "signature"))
            w.uint32(34).bytes(m.signature);
        if (m.timeReceived != null && Object.hasOwnProperty.call(m, "timeReceived"))
            w.uint32(42).string(m.timeReceived);
        return w;
    };

    /**
     * Decodes a Record message from the specified reader or buffer.
     * @function decode
     * @memberof Record
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Record} Record
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Record.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Record();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.key = r.bytes();
                break;
            case 2:
                m.value = r.bytes();
                break;
            case 3:
                m.author = r.bytes();
                break;
            case 4:
                m.signature = r.bytes();
                break;
            case 5:
                m.timeReceived = r.string();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Record message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Record
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Record} Record
     */
    Record.fromObject = function fromObject(d) {
        if (d instanceof $root.Record)
            return d;
        var m = new $root.Record();
        if (d.key != null) {
            if (typeof d.key === "string")
                $util.base64.decode(d.key, m.key = $util.newBuffer($util.base64.length(d.key)), 0);
            else if (d.key.length)
                m.key = d.key;
        }
        if (d.value != null) {
            if (typeof d.value === "string")
                $util.base64.decode(d.value, m.value = $util.newBuffer($util.base64.length(d.value)), 0);
            else if (d.value.length)
                m.value = d.value;
        }
        if (d.author != null) {
            if (typeof d.author === "string")
                $util.base64.decode(d.author, m.author = $util.newBuffer($util.base64.length(d.author)), 0);
            else if (d.author.length)
                m.author = d.author;
        }
        if (d.signature != null) {
            if (typeof d.signature === "string")
                $util.base64.decode(d.signature, m.signature = $util.newBuffer($util.base64.length(d.signature)), 0);
            else if (d.signature.length)
                m.signature = d.signature;
        }
        if (d.timeReceived != null) {
            m.timeReceived = String(d.timeReceived);
        }
        return m;
    };

    /**
     * Creates a plain object from a Record message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Record
     * @static
     * @param {Record} m Record
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Record.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (m.key != null && m.hasOwnProperty("key")) {
            d.key = o.bytes === String ? $util.base64.encode(m.key, 0, m.key.length) : o.bytes === Array ? Array.prototype.slice.call(m.key) : m.key;
            if (o.oneofs)
                d._key = "key";
        }
        if (m.value != null && m.hasOwnProperty("value")) {
            d.value = o.bytes === String ? $util.base64.encode(m.value, 0, m.value.length) : o.bytes === Array ? Array.prototype.slice.call(m.value) : m.value;
            if (o.oneofs)
                d._value = "value";
        }
        if (m.author != null && m.hasOwnProperty("author")) {
            d.author = o.bytes === String ? $util.base64.encode(m.author, 0, m.author.length) : o.bytes === Array ? Array.prototype.slice.call(m.author) : m.author;
            if (o.oneofs)
                d._author = "author";
        }
        if (m.signature != null && m.hasOwnProperty("signature")) {
            d.signature = o.bytes === String ? $util.base64.encode(m.signature, 0, m.signature.length) : o.bytes === Array ? Array.prototype.slice.call(m.signature) : m.signature;
            if (o.oneofs)
                d._signature = "signature";
        }
        if (m.timeReceived != null && m.hasOwnProperty("timeReceived")) {
            d.timeReceived = m.timeReceived;
            if (o.oneofs)
                d._timeReceived = "timeReceived";
        }
        return d;
    };

    /**
     * Converts this Record to JSON.
     * @function toJSON
     * @memberof Record
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Record.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Record;
})();

$root.Message = (function() {

    /**
     * Properties of a Message.
     * @exports IMessage
     * @interface IMessage
     * @property {Message.MessageType|null} [type] Message type
     * @property {number|null} [clusterLevelRaw] Message clusterLevelRaw
     * @property {Uint8Array|null} [key] Message key
     * @property {Uint8Array|null} [record] Message record
     * @property {Array.<Message.IPeer>|null} [closerPeers] Message closerPeers
     * @property {Array.<Message.IPeer>|null} [providerPeers] Message providerPeers
     */

    /**
     * Constructs a new Message.
     * @exports Message
     * @classdesc Represents a Message.
     * @implements IMessage
     * @constructor
     * @param {IMessage=} [p] Properties to set
     */
    function Message(p) {
        this.closerPeers = [];
        this.providerPeers = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * Message type.
     * @member {Message.MessageType|null|undefined} type
     * @memberof Message
     * @instance
     */
    Message.prototype.type = null;

    /**
     * Message clusterLevelRaw.
     * @member {number|null|undefined} clusterLevelRaw
     * @memberof Message
     * @instance
     */
    Message.prototype.clusterLevelRaw = null;

    /**
     * Message key.
     * @member {Uint8Array|null|undefined} key
     * @memberof Message
     * @instance
     */
    Message.prototype.key = null;

    /**
     * Message record.
     * @member {Uint8Array|null|undefined} record
     * @memberof Message
     * @instance
     */
    Message.prototype.record = null;

    /**
     * Message closerPeers.
     * @member {Array.<Message.IPeer>} closerPeers
     * @memberof Message
     * @instance
     */
    Message.prototype.closerPeers = $util.emptyArray;

    /**
     * Message providerPeers.
     * @member {Array.<Message.IPeer>} providerPeers
     * @memberof Message
     * @instance
     */
    Message.prototype.providerPeers = $util.emptyArray;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * Message _type.
     * @member {"type"|undefined} _type
     * @memberof Message
     * @instance
     */
    Object.defineProperty(Message.prototype, "_type", {
        get: $util.oneOfGetter($oneOfFields = ["type"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Message _clusterLevelRaw.
     * @member {"clusterLevelRaw"|undefined} _clusterLevelRaw
     * @memberof Message
     * @instance
     */
    Object.defineProperty(Message.prototype, "_clusterLevelRaw", {
        get: $util.oneOfGetter($oneOfFields = ["clusterLevelRaw"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Message _key.
     * @member {"key"|undefined} _key
     * @memberof Message
     * @instance
     */
    Object.defineProperty(Message.prototype, "_key", {
        get: $util.oneOfGetter($oneOfFields = ["key"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Message _record.
     * @member {"record"|undefined} _record
     * @memberof Message
     * @instance
     */
    Object.defineProperty(Message.prototype, "_record", {
        get: $util.oneOfGetter($oneOfFields = ["record"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified Message message. Does not implicitly {@link Message.verify|verify} messages.
     * @function encode
     * @memberof Message
     * @static
     * @param {IMessage} m Message message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Message.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.type != null && Object.hasOwnProperty.call(m, "type"))
            w.uint32(8).int32(m.type);
        if (m.key != null && Object.hasOwnProperty.call(m, "key"))
            w.uint32(18).bytes(m.key);
        if (m.record != null && Object.hasOwnProperty.call(m, "record"))
            w.uint32(26).bytes(m.record);
        if (m.closerPeers != null && m.closerPeers.length) {
            for (var i = 0; i < m.closerPeers.length; ++i)
                $root.Message.Peer.encode(m.closerPeers[i], w.uint32(66).fork()).ldelim();
        }
        if (m.providerPeers != null && m.providerPeers.length) {
            for (var i = 0; i < m.providerPeers.length; ++i)
                $root.Message.Peer.encode(m.providerPeers[i], w.uint32(74).fork()).ldelim();
        }
        if (m.clusterLevelRaw != null && Object.hasOwnProperty.call(m, "clusterLevelRaw"))
            w.uint32(80).int32(m.clusterLevelRaw);
        return w;
    };

    /**
     * Decodes a Message message from the specified reader or buffer.
     * @function decode
     * @memberof Message
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {Message} Message
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Message.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.Message();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.type = r.int32();
                break;
            case 10:
                m.clusterLevelRaw = r.int32();
                break;
            case 2:
                m.key = r.bytes();
                break;
            case 3:
                m.record = r.bytes();
                break;
            case 8:
                if (!(m.closerPeers && m.closerPeers.length))
                    m.closerPeers = [];
                m.closerPeers.push($root.Message.Peer.decode(r, r.uint32()));
                break;
            case 9:
                if (!(m.providerPeers && m.providerPeers.length))
                    m.providerPeers = [];
                m.providerPeers.push($root.Message.Peer.decode(r, r.uint32()));
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a Message message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Message
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {Message} Message
     */
    Message.fromObject = function fromObject(d) {
        if (d instanceof $root.Message)
            return d;
        var m = new $root.Message();
        switch (d.type) {
        case "PUT_VALUE":
        case 0:
            m.type = 0;
            break;
        case "GET_VALUE":
        case 1:
            m.type = 1;
            break;
        case "ADD_PROVIDER":
        case 2:
            m.type = 2;
            break;
        case "GET_PROVIDERS":
        case 3:
            m.type = 3;
            break;
        case "FIND_NODE":
        case 4:
            m.type = 4;
            break;
        case "PING":
        case 5:
            m.type = 5;
            break;
        }
        if (d.clusterLevelRaw != null) {
            m.clusterLevelRaw = d.clusterLevelRaw | 0;
        }
        if (d.key != null) {
            if (typeof d.key === "string")
                $util.base64.decode(d.key, m.key = $util.newBuffer($util.base64.length(d.key)), 0);
            else if (d.key.length)
                m.key = d.key;
        }
        if (d.record != null) {
            if (typeof d.record === "string")
                $util.base64.decode(d.record, m.record = $util.newBuffer($util.base64.length(d.record)), 0);
            else if (d.record.length)
                m.record = d.record;
        }
        if (d.closerPeers) {
            if (!Array.isArray(d.closerPeers))
                throw TypeError(".Message.closerPeers: array expected");
            m.closerPeers = [];
            for (var i = 0; i < d.closerPeers.length; ++i) {
                if (typeof d.closerPeers[i] !== "object")
                    throw TypeError(".Message.closerPeers: object expected");
                m.closerPeers[i] = $root.Message.Peer.fromObject(d.closerPeers[i]);
            }
        }
        if (d.providerPeers) {
            if (!Array.isArray(d.providerPeers))
                throw TypeError(".Message.providerPeers: array expected");
            m.providerPeers = [];
            for (var i = 0; i < d.providerPeers.length; ++i) {
                if (typeof d.providerPeers[i] !== "object")
                    throw TypeError(".Message.providerPeers: object expected");
                m.providerPeers[i] = $root.Message.Peer.fromObject(d.providerPeers[i]);
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a Message message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Message
     * @static
     * @param {Message} m Message
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Message.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.closerPeers = [];
            d.providerPeers = [];
        }
        if (m.type != null && m.hasOwnProperty("type")) {
            d.type = o.enums === String ? $root.Message.MessageType[m.type] : m.type;
            if (o.oneofs)
                d._type = "type";
        }
        if (m.key != null && m.hasOwnProperty("key")) {
            d.key = o.bytes === String ? $util.base64.encode(m.key, 0, m.key.length) : o.bytes === Array ? Array.prototype.slice.call(m.key) : m.key;
            if (o.oneofs)
                d._key = "key";
        }
        if (m.record != null && m.hasOwnProperty("record")) {
            d.record = o.bytes === String ? $util.base64.encode(m.record, 0, m.record.length) : o.bytes === Array ? Array.prototype.slice.call(m.record) : m.record;
            if (o.oneofs)
                d._record = "record";
        }
        if (m.closerPeers && m.closerPeers.length) {
            d.closerPeers = [];
            for (var j = 0; j < m.closerPeers.length; ++j) {
                d.closerPeers[j] = $root.Message.Peer.toObject(m.closerPeers[j], o);
            }
        }
        if (m.providerPeers && m.providerPeers.length) {
            d.providerPeers = [];
            for (var j = 0; j < m.providerPeers.length; ++j) {
                d.providerPeers[j] = $root.Message.Peer.toObject(m.providerPeers[j], o);
            }
        }
        if (m.clusterLevelRaw != null && m.hasOwnProperty("clusterLevelRaw")) {
            d.clusterLevelRaw = m.clusterLevelRaw;
            if (o.oneofs)
                d._clusterLevelRaw = "clusterLevelRaw";
        }
        return d;
    };

    /**
     * Converts this Message to JSON.
     * @function toJSON
     * @memberof Message
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Message.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * MessageType enum.
     * @name Message.MessageType
     * @enum {number}
     * @property {number} PUT_VALUE=0 PUT_VALUE value
     * @property {number} GET_VALUE=1 GET_VALUE value
     * @property {number} ADD_PROVIDER=2 ADD_PROVIDER value
     * @property {number} GET_PROVIDERS=3 GET_PROVIDERS value
     * @property {number} FIND_NODE=4 FIND_NODE value
     * @property {number} PING=5 PING value
     */
    Message.MessageType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "PUT_VALUE"] = 0;
        values[valuesById[1] = "GET_VALUE"] = 1;
        values[valuesById[2] = "ADD_PROVIDER"] = 2;
        values[valuesById[3] = "GET_PROVIDERS"] = 3;
        values[valuesById[4] = "FIND_NODE"] = 4;
        values[valuesById[5] = "PING"] = 5;
        return values;
    })();

    /**
     * ConnectionType enum.
     * @name Message.ConnectionType
     * @enum {number}
     * @property {number} NOT_CONNECTED=0 NOT_CONNECTED value
     * @property {number} CONNECTED=1 CONNECTED value
     * @property {number} CAN_CONNECT=2 CAN_CONNECT value
     * @property {number} CANNOT_CONNECT=3 CANNOT_CONNECT value
     */
    Message.ConnectionType = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "NOT_CONNECTED"] = 0;
        values[valuesById[1] = "CONNECTED"] = 1;
        values[valuesById[2] = "CAN_CONNECT"] = 2;
        values[valuesById[3] = "CANNOT_CONNECT"] = 3;
        return values;
    })();

    Message.Peer = (function() {

        /**
         * Properties of a Peer.
         * @memberof Message
         * @interface IPeer
         * @property {Uint8Array|null} [id] Peer id
         * @property {Array.<Uint8Array>|null} [addrs] Peer addrs
         * @property {Message.ConnectionType|null} [connection] Peer connection
         */

        /**
         * Constructs a new Peer.
         * @memberof Message
         * @classdesc Represents a Peer.
         * @implements IPeer
         * @constructor
         * @param {Message.IPeer=} [p] Properties to set
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
         * @member {Uint8Array|null|undefined} id
         * @memberof Message.Peer
         * @instance
         */
        Peer.prototype.id = null;

        /**
         * Peer addrs.
         * @member {Array.<Uint8Array>} addrs
         * @memberof Message.Peer
         * @instance
         */
        Peer.prototype.addrs = $util.emptyArray;

        /**
         * Peer connection.
         * @member {Message.ConnectionType|null|undefined} connection
         * @memberof Message.Peer
         * @instance
         */
        Peer.prototype.connection = null;

        // OneOf field names bound to virtual getters and setters
        var $oneOfFields;

        /**
         * Peer _id.
         * @member {"id"|undefined} _id
         * @memberof Message.Peer
         * @instance
         */
        Object.defineProperty(Peer.prototype, "_id", {
            get: $util.oneOfGetter($oneOfFields = ["id"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Peer _connection.
         * @member {"connection"|undefined} _connection
         * @memberof Message.Peer
         * @instance
         */
        Object.defineProperty(Peer.prototype, "_connection", {
            get: $util.oneOfGetter($oneOfFields = ["connection"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Peer message. Does not implicitly {@link Message.Peer.verify|verify} messages.
         * @function encode
         * @memberof Message.Peer
         * @static
         * @param {Message.IPeer} m Peer message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Peer.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.id != null && Object.hasOwnProperty.call(m, "id"))
                w.uint32(10).bytes(m.id);
            if (m.addrs != null && m.addrs.length) {
                for (var i = 0; i < m.addrs.length; ++i)
                    w.uint32(18).bytes(m.addrs[i]);
            }
            if (m.connection != null && Object.hasOwnProperty.call(m, "connection"))
                w.uint32(24).int32(m.connection);
            return w;
        };

        /**
         * Decodes a Peer message from the specified reader or buffer.
         * @function decode
         * @memberof Message.Peer
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {Message.Peer} Peer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Peer.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.Message.Peer();
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
                case 3:
                    m.connection = r.int32();
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
         * @memberof Message.Peer
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {Message.Peer} Peer
         */
        Peer.fromObject = function fromObject(d) {
            if (d instanceof $root.Message.Peer)
                return d;
            var m = new $root.Message.Peer();
            if (d.id != null) {
                if (typeof d.id === "string")
                    $util.base64.decode(d.id, m.id = $util.newBuffer($util.base64.length(d.id)), 0);
                else if (d.id.length)
                    m.id = d.id;
            }
            if (d.addrs) {
                if (!Array.isArray(d.addrs))
                    throw TypeError(".Message.Peer.addrs: array expected");
                m.addrs = [];
                for (var i = 0; i < d.addrs.length; ++i) {
                    if (typeof d.addrs[i] === "string")
                        $util.base64.decode(d.addrs[i], m.addrs[i] = $util.newBuffer($util.base64.length(d.addrs[i])), 0);
                    else if (d.addrs[i].length)
                        m.addrs[i] = d.addrs[i];
                }
            }
            switch (d.connection) {
            case "NOT_CONNECTED":
            case 0:
                m.connection = 0;
                break;
            case "CONNECTED":
            case 1:
                m.connection = 1;
                break;
            case "CAN_CONNECT":
            case 2:
                m.connection = 2;
                break;
            case "CANNOT_CONNECT":
            case 3:
                m.connection = 3;
                break;
            }
            return m;
        };

        /**
         * Creates a plain object from a Peer message. Also converts values to other types if specified.
         * @function toObject
         * @memberof Message.Peer
         * @static
         * @param {Message.Peer} m Peer
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
            if (m.id != null && m.hasOwnProperty("id")) {
                d.id = o.bytes === String ? $util.base64.encode(m.id, 0, m.id.length) : o.bytes === Array ? Array.prototype.slice.call(m.id) : m.id;
                if (o.oneofs)
                    d._id = "id";
            }
            if (m.addrs && m.addrs.length) {
                d.addrs = [];
                for (var j = 0; j < m.addrs.length; ++j) {
                    d.addrs[j] = o.bytes === String ? $util.base64.encode(m.addrs[j], 0, m.addrs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.addrs[j]) : m.addrs[j];
                }
            }
            if (m.connection != null && m.hasOwnProperty("connection")) {
                d.connection = o.enums === String ? $root.Message.ConnectionType[m.connection] : m.connection;
                if (o.oneofs)
                    d._connection = "connection";
            }
            return d;
        };

        /**
         * Converts this Peer to JSON.
         * @function toJSON
         * @memberof Message.Peer
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Peer.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Peer;
    })();

    return Message;
})();

module.exports = $root;
