/*eslint-disable*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["libp2p-floodsub"] || ($protobuf.roots["libp2p-floodsub"] = {});

export const RPC = $root.RPC = (() => {

    /**
     * Properties of a RPC.
     * @exports IRPC
     * @interface IRPC
     * @property {Array.<RPC.ISubOpts>|null} [subscriptions] RPC subscriptions
     * @property {Array.<RPC.IMessage>|null} [messages] RPC messages
     * @property {IControlMessage|null} [control] RPC control
     */

    /**
     * Constructs a new RPC.
     * @exports RPC
     * @classdesc Represents a RPC.
     * @implements IRPC
     * @constructor
     * @param {IRPC=} [p] Properties to set
     */
    function RPC(p) {
        this.subscriptions = [];
        this.messages = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * RPC subscriptions.
     * @member {Array.<RPC.ISubOpts>} subscriptions
     * @memberof RPC
     * @instance
     */
    RPC.prototype.subscriptions = $util.emptyArray;

    /**
     * RPC messages.
     * @member {Array.<RPC.IMessage>} messages
     * @memberof RPC
     * @instance
     */
    RPC.prototype.messages = $util.emptyArray;

    /**
     * RPC control.
     * @member {IControlMessage|null|undefined} control
     * @memberof RPC
     * @instance
     */
    RPC.prototype.control = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * RPC _control.
     * @member {"control"|undefined} _control
     * @memberof RPC
     * @instance
     */
    Object.defineProperty(RPC.prototype, "_control", {
        get: $util.oneOfGetter($oneOfFields = ["control"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified RPC message. Does not implicitly {@link RPC.verify|verify} messages.
     * @function encode
     * @memberof RPC
     * @static
     * @param {IRPC} m RPC message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RPC.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.subscriptions != null && m.subscriptions.length) {
            for (var i = 0; i < m.subscriptions.length; ++i)
                $root.RPC.SubOpts.encode(m.subscriptions[i], w.uint32(10).fork()).ldelim();
        }
        if (m.messages != null && m.messages.length) {
            for (var i = 0; i < m.messages.length; ++i)
                $root.RPC.Message.encode(m.messages[i], w.uint32(18).fork()).ldelim();
        }
        if (m.control != null && Object.hasOwnProperty.call(m, "control"))
            $root.ControlMessage.encode(m.control, w.uint32(26).fork()).ldelim();
        return w;
    };

    /**
     * Decodes a RPC message from the specified reader or buffer.
     * @function decode
     * @memberof RPC
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {RPC} RPC
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RPC.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.subscriptions && m.subscriptions.length))
                    m.subscriptions = [];
                m.subscriptions.push($root.RPC.SubOpts.decode(r, r.uint32()));
                break;
            case 2:
                if (!(m.messages && m.messages.length))
                    m.messages = [];
                m.messages.push($root.RPC.Message.decode(r, r.uint32()));
                break;
            case 3:
                m.control = $root.ControlMessage.decode(r, r.uint32());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a RPC message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RPC
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {RPC} RPC
     */
    RPC.fromObject = function fromObject(d) {
        if (d instanceof $root.RPC)
            return d;
        var m = new $root.RPC();
        if (d.subscriptions) {
            if (!Array.isArray(d.subscriptions))
                throw TypeError(".RPC.subscriptions: array expected");
            m.subscriptions = [];
            for (var i = 0; i < d.subscriptions.length; ++i) {
                if (typeof d.subscriptions[i] !== "object")
                    throw TypeError(".RPC.subscriptions: object expected");
                m.subscriptions[i] = $root.RPC.SubOpts.fromObject(d.subscriptions[i]);
            }
        }
        if (d.messages) {
            if (!Array.isArray(d.messages))
                throw TypeError(".RPC.messages: array expected");
            m.messages = [];
            for (var i = 0; i < d.messages.length; ++i) {
                if (typeof d.messages[i] !== "object")
                    throw TypeError(".RPC.messages: object expected");
                m.messages[i] = $root.RPC.Message.fromObject(d.messages[i]);
            }
        }
        if (d.control != null) {
            if (typeof d.control !== "object")
                throw TypeError(".RPC.control: object expected");
            m.control = $root.ControlMessage.fromObject(d.control);
        }
        return m;
    };

    /**
     * Creates a plain object from a RPC message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RPC
     * @static
     * @param {RPC} m RPC
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RPC.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.subscriptions = [];
            d.messages = [];
        }
        if (m.subscriptions && m.subscriptions.length) {
            d.subscriptions = [];
            for (var j = 0; j < m.subscriptions.length; ++j) {
                d.subscriptions[j] = $root.RPC.SubOpts.toObject(m.subscriptions[j], o);
            }
        }
        if (m.messages && m.messages.length) {
            d.messages = [];
            for (var j = 0; j < m.messages.length; ++j) {
                d.messages[j] = $root.RPC.Message.toObject(m.messages[j], o);
            }
        }
        if (m.control != null && m.hasOwnProperty("control")) {
            d.control = $root.ControlMessage.toObject(m.control, o);
            if (o.oneofs)
                d._control = "control";
        }
        return d;
    };

    /**
     * Converts this RPC to JSON.
     * @function toJSON
     * @memberof RPC
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RPC.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    RPC.SubOpts = (function() {

        /**
         * Properties of a SubOpts.
         * @memberof RPC
         * @interface ISubOpts
         * @property {boolean|null} [subscribe] SubOpts subscribe
         * @property {string|null} [topic] SubOpts topic
         */

        /**
         * Constructs a new SubOpts.
         * @memberof RPC
         * @classdesc Represents a SubOpts.
         * @implements ISubOpts
         * @constructor
         * @param {RPC.ISubOpts=} [p] Properties to set
         */
        function SubOpts(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * SubOpts subscribe.
         * @member {boolean|null|undefined} subscribe
         * @memberof RPC.SubOpts
         * @instance
         */
        SubOpts.prototype.subscribe = null;

        /**
         * SubOpts topic.
         * @member {string|null|undefined} topic
         * @memberof RPC.SubOpts
         * @instance
         */
        SubOpts.prototype.topic = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * SubOpts _subscribe.
         * @member {"subscribe"|undefined} _subscribe
         * @memberof RPC.SubOpts
         * @instance
         */
        Object.defineProperty(SubOpts.prototype, "_subscribe", {
            get: $util.oneOfGetter($oneOfFields = ["subscribe"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * SubOpts _topic.
         * @member {"topic"|undefined} _topic
         * @memberof RPC.SubOpts
         * @instance
         */
        Object.defineProperty(SubOpts.prototype, "_topic", {
            get: $util.oneOfGetter($oneOfFields = ["topic"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified SubOpts message. Does not implicitly {@link RPC.SubOpts.verify|verify} messages.
         * @function encode
         * @memberof RPC.SubOpts
         * @static
         * @param {RPC.ISubOpts} m SubOpts message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SubOpts.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.subscribe != null && Object.hasOwnProperty.call(m, "subscribe"))
                w.uint32(8).bool(m.subscribe);
            if (m.topic != null && Object.hasOwnProperty.call(m, "topic"))
                w.uint32(18).string(m.topic);
            return w;
        };

        /**
         * Decodes a SubOpts message from the specified reader or buffer.
         * @function decode
         * @memberof RPC.SubOpts
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {RPC.SubOpts} SubOpts
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SubOpts.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.SubOpts();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.subscribe = r.bool();
                    break;
                case 2:
                    m.topic = r.string();
                    break;
                default:
                    r.skipType(t & 7);
                    break;
                }
            }
            return m;
        };

        /**
         * Creates a SubOpts message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof RPC.SubOpts
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {RPC.SubOpts} SubOpts
         */
        SubOpts.fromObject = function fromObject(d) {
            if (d instanceof $root.RPC.SubOpts)
                return d;
            var m = new $root.RPC.SubOpts();
            if (d.subscribe != null) {
                m.subscribe = Boolean(d.subscribe);
            }
            if (d.topic != null) {
                m.topic = String(d.topic);
            }
            return m;
        };

        /**
         * Creates a plain object from a SubOpts message. Also converts values to other types if specified.
         * @function toObject
         * @memberof RPC.SubOpts
         * @static
         * @param {RPC.SubOpts} m SubOpts
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SubOpts.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (m.subscribe != null && m.hasOwnProperty("subscribe")) {
                d.subscribe = m.subscribe;
                if (o.oneofs)
                    d._subscribe = "subscribe";
            }
            if (m.topic != null && m.hasOwnProperty("topic")) {
                d.topic = m.topic;
                if (o.oneofs)
                    d._topic = "topic";
            }
            return d;
        };

        /**
         * Converts this SubOpts to JSON.
         * @function toJSON
         * @memberof RPC.SubOpts
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SubOpts.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return SubOpts;
    })();

    RPC.Message = (function() {

        /**
         * Properties of a Message.
         * @memberof RPC
         * @interface IMessage
         * @property {Uint8Array|null} [from] Message from
         * @property {Uint8Array|null} [data] Message data
         * @property {Uint8Array|null} [sequenceNumber] Message sequenceNumber
         * @property {string|null} [topic] Message topic
         * @property {Uint8Array|null} [signature] Message signature
         * @property {Uint8Array|null} [key] Message key
         */

        /**
         * Constructs a new Message.
         * @memberof RPC
         * @classdesc Represents a Message.
         * @implements IMessage
         * @constructor
         * @param {RPC.IMessage=} [p] Properties to set
         */
        function Message(p) {
            if (p)
                for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                    if (p[ks[i]] != null)
                        this[ks[i]] = p[ks[i]];
        }

        /**
         * Message from.
         * @member {Uint8Array|null|undefined} from
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.from = null;

        /**
         * Message data.
         * @member {Uint8Array|null|undefined} data
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.data = null;

        /**
         * Message sequenceNumber.
         * @member {Uint8Array|null|undefined} sequenceNumber
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.sequenceNumber = null;

        /**
         * Message topic.
         * @member {string|null|undefined} topic
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.topic = null;

        /**
         * Message signature.
         * @member {Uint8Array|null|undefined} signature
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.signature = null;

        /**
         * Message key.
         * @member {Uint8Array|null|undefined} key
         * @memberof RPC.Message
         * @instance
         */
        Message.prototype.key = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Message _from.
         * @member {"from"|undefined} _from
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_from", {
            get: $util.oneOfGetter($oneOfFields = ["from"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Message _data.
         * @member {"data"|undefined} _data
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_data", {
            get: $util.oneOfGetter($oneOfFields = ["data"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Message _sequenceNumber.
         * @member {"sequenceNumber"|undefined} _sequenceNumber
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_sequenceNumber", {
            get: $util.oneOfGetter($oneOfFields = ["sequenceNumber"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Message _topic.
         * @member {"topic"|undefined} _topic
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_topic", {
            get: $util.oneOfGetter($oneOfFields = ["topic"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Message _signature.
         * @member {"signature"|undefined} _signature
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_signature", {
            get: $util.oneOfGetter($oneOfFields = ["signature"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Message _key.
         * @member {"key"|undefined} _key
         * @memberof RPC.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "_key", {
            get: $util.oneOfGetter($oneOfFields = ["key"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Message message. Does not implicitly {@link RPC.Message.verify|verify} messages.
         * @function encode
         * @memberof RPC.Message
         * @static
         * @param {RPC.IMessage} m Message message or plain object to encode
         * @param {$protobuf.Writer} [w] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function encode(m, w) {
            if (!w)
                w = $Writer.create();
            if (m.from != null && Object.hasOwnProperty.call(m, "from"))
                w.uint32(10).bytes(m.from);
            if (m.data != null && Object.hasOwnProperty.call(m, "data"))
                w.uint32(18).bytes(m.data);
            if (m.sequenceNumber != null && Object.hasOwnProperty.call(m, "sequenceNumber"))
                w.uint32(26).bytes(m.sequenceNumber);
            if (m.topic != null && Object.hasOwnProperty.call(m, "topic"))
                w.uint32(34).string(m.topic);
            if (m.signature != null && Object.hasOwnProperty.call(m, "signature"))
                w.uint32(42).bytes(m.signature);
            if (m.key != null && Object.hasOwnProperty.call(m, "key"))
                w.uint32(50).bytes(m.key);
            return w;
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof RPC.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
         * @param {number} [l] Message length if known beforehand
         * @returns {RPC.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function decode(r, l) {
            if (!(r instanceof $Reader))
                r = $Reader.create(r);
            var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.Message();
            while (r.pos < c) {
                var t = r.uint32();
                switch (t >>> 3) {
                case 1:
                    m.from = r.bytes();
                    break;
                case 2:
                    m.data = r.bytes();
                    break;
                case 3:
                    m.sequenceNumber = r.bytes();
                    break;
                case 4:
                    m.topic = r.string();
                    break;
                case 5:
                    m.signature = r.bytes();
                    break;
                case 6:
                    m.key = r.bytes();
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
         * @memberof RPC.Message
         * @static
         * @param {Object.<string,*>} d Plain object
         * @returns {RPC.Message} Message
         */
        Message.fromObject = function fromObject(d) {
            if (d instanceof $root.RPC.Message)
                return d;
            var m = new $root.RPC.Message();
            if (d.from != null) {
                if (typeof d.from === "string")
                    $util.base64.decode(d.from, m.from = $util.newBuffer($util.base64.length(d.from)), 0);
                else if (d.from.length)
                    m.from = d.from;
            }
            if (d.data != null) {
                if (typeof d.data === "string")
                    $util.base64.decode(d.data, m.data = $util.newBuffer($util.base64.length(d.data)), 0);
                else if (d.data.length)
                    m.data = d.data;
            }
            if (d.sequenceNumber != null) {
                if (typeof d.sequenceNumber === "string")
                    $util.base64.decode(d.sequenceNumber, m.sequenceNumber = $util.newBuffer($util.base64.length(d.sequenceNumber)), 0);
                else if (d.sequenceNumber.length)
                    m.sequenceNumber = d.sequenceNumber;
            }
            if (d.topic != null) {
                m.topic = String(d.topic);
            }
            if (d.signature != null) {
                if (typeof d.signature === "string")
                    $util.base64.decode(d.signature, m.signature = $util.newBuffer($util.base64.length(d.signature)), 0);
                else if (d.signature.length)
                    m.signature = d.signature;
            }
            if (d.key != null) {
                if (typeof d.key === "string")
                    $util.base64.decode(d.key, m.key = $util.newBuffer($util.base64.length(d.key)), 0);
                else if (d.key.length)
                    m.key = d.key;
            }
            return m;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof RPC.Message
         * @static
         * @param {RPC.Message} m Message
         * @param {$protobuf.IConversionOptions} [o] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function toObject(m, o) {
            if (!o)
                o = {};
            var d = {};
            if (m.from != null && m.hasOwnProperty("from")) {
                d.from = o.bytes === String ? $util.base64.encode(m.from, 0, m.from.length) : o.bytes === Array ? Array.prototype.slice.call(m.from) : m.from;
                if (o.oneofs)
                    d._from = "from";
            }
            if (m.data != null && m.hasOwnProperty("data")) {
                d.data = o.bytes === String ? $util.base64.encode(m.data, 0, m.data.length) : o.bytes === Array ? Array.prototype.slice.call(m.data) : m.data;
                if (o.oneofs)
                    d._data = "data";
            }
            if (m.sequenceNumber != null && m.hasOwnProperty("sequenceNumber")) {
                d.sequenceNumber = o.bytes === String ? $util.base64.encode(m.sequenceNumber, 0, m.sequenceNumber.length) : o.bytes === Array ? Array.prototype.slice.call(m.sequenceNumber) : m.sequenceNumber;
                if (o.oneofs)
                    d._sequenceNumber = "sequenceNumber";
            }
            if (m.topic != null && m.hasOwnProperty("topic")) {
                d.topic = m.topic;
                if (o.oneofs)
                    d._topic = "topic";
            }
            if (m.signature != null && m.hasOwnProperty("signature")) {
                d.signature = o.bytes === String ? $util.base64.encode(m.signature, 0, m.signature.length) : o.bytes === Array ? Array.prototype.slice.call(m.signature) : m.signature;
                if (o.oneofs)
                    d._signature = "signature";
            }
            if (m.key != null && m.hasOwnProperty("key")) {
                d.key = o.bytes === String ? $util.base64.encode(m.key, 0, m.key.length) : o.bytes === Array ? Array.prototype.slice.call(m.key) : m.key;
                if (o.oneofs)
                    d._key = "key";
            }
            return d;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof RPC.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Message;
    })();

    return RPC;
})();

export const ControlMessage = $root.ControlMessage = (() => {

    /**
     * Properties of a ControlMessage.
     * @exports IControlMessage
     * @interface IControlMessage
     * @property {Array.<IControlIHave>|null} [ihave] ControlMessage ihave
     * @property {Array.<IControlIWant>|null} [iwant] ControlMessage iwant
     * @property {Array.<IControlGraft>|null} [graft] ControlMessage graft
     * @property {Array.<IControlPrune>|null} [prune] ControlMessage prune
     */

    /**
     * Constructs a new ControlMessage.
     * @exports ControlMessage
     * @classdesc Represents a ControlMessage.
     * @implements IControlMessage
     * @constructor
     * @param {IControlMessage=} [p] Properties to set
     */
    function ControlMessage(p) {
        this.ihave = [];
        this.iwant = [];
        this.graft = [];
        this.prune = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ControlMessage ihave.
     * @member {Array.<IControlIHave>} ihave
     * @memberof ControlMessage
     * @instance
     */
    ControlMessage.prototype.ihave = $util.emptyArray;

    /**
     * ControlMessage iwant.
     * @member {Array.<IControlIWant>} iwant
     * @memberof ControlMessage
     * @instance
     */
    ControlMessage.prototype.iwant = $util.emptyArray;

    /**
     * ControlMessage graft.
     * @member {Array.<IControlGraft>} graft
     * @memberof ControlMessage
     * @instance
     */
    ControlMessage.prototype.graft = $util.emptyArray;

    /**
     * ControlMessage prune.
     * @member {Array.<IControlPrune>} prune
     * @memberof ControlMessage
     * @instance
     */
    ControlMessage.prototype.prune = $util.emptyArray;

    /**
     * Encodes the specified ControlMessage message. Does not implicitly {@link ControlMessage.verify|verify} messages.
     * @function encode
     * @memberof ControlMessage
     * @static
     * @param {IControlMessage} m ControlMessage message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ControlMessage.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.ihave != null && m.ihave.length) {
            for (var i = 0; i < m.ihave.length; ++i)
                $root.ControlIHave.encode(m.ihave[i], w.uint32(10).fork()).ldelim();
        }
        if (m.iwant != null && m.iwant.length) {
            for (var i = 0; i < m.iwant.length; ++i)
                $root.ControlIWant.encode(m.iwant[i], w.uint32(18).fork()).ldelim();
        }
        if (m.graft != null && m.graft.length) {
            for (var i = 0; i < m.graft.length; ++i)
                $root.ControlGraft.encode(m.graft[i], w.uint32(26).fork()).ldelim();
        }
        if (m.prune != null && m.prune.length) {
            for (var i = 0; i < m.prune.length; ++i)
                $root.ControlPrune.encode(m.prune[i], w.uint32(34).fork()).ldelim();
        }
        return w;
    };

    /**
     * Decodes a ControlMessage message from the specified reader or buffer.
     * @function decode
     * @memberof ControlMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ControlMessage} ControlMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ControlMessage.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ControlMessage();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.ihave && m.ihave.length))
                    m.ihave = [];
                m.ihave.push($root.ControlIHave.decode(r, r.uint32()));
                break;
            case 2:
                if (!(m.iwant && m.iwant.length))
                    m.iwant = [];
                m.iwant.push($root.ControlIWant.decode(r, r.uint32()));
                break;
            case 3:
                if (!(m.graft && m.graft.length))
                    m.graft = [];
                m.graft.push($root.ControlGraft.decode(r, r.uint32()));
                break;
            case 4:
                if (!(m.prune && m.prune.length))
                    m.prune = [];
                m.prune.push($root.ControlPrune.decode(r, r.uint32()));
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a ControlMessage message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ControlMessage
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ControlMessage} ControlMessage
     */
    ControlMessage.fromObject = function fromObject(d) {
        if (d instanceof $root.ControlMessage)
            return d;
        var m = new $root.ControlMessage();
        if (d.ihave) {
            if (!Array.isArray(d.ihave))
                throw TypeError(".ControlMessage.ihave: array expected");
            m.ihave = [];
            for (var i = 0; i < d.ihave.length; ++i) {
                if (typeof d.ihave[i] !== "object")
                    throw TypeError(".ControlMessage.ihave: object expected");
                m.ihave[i] = $root.ControlIHave.fromObject(d.ihave[i]);
            }
        }
        if (d.iwant) {
            if (!Array.isArray(d.iwant))
                throw TypeError(".ControlMessage.iwant: array expected");
            m.iwant = [];
            for (var i = 0; i < d.iwant.length; ++i) {
                if (typeof d.iwant[i] !== "object")
                    throw TypeError(".ControlMessage.iwant: object expected");
                m.iwant[i] = $root.ControlIWant.fromObject(d.iwant[i]);
            }
        }
        if (d.graft) {
            if (!Array.isArray(d.graft))
                throw TypeError(".ControlMessage.graft: array expected");
            m.graft = [];
            for (var i = 0; i < d.graft.length; ++i) {
                if (typeof d.graft[i] !== "object")
                    throw TypeError(".ControlMessage.graft: object expected");
                m.graft[i] = $root.ControlGraft.fromObject(d.graft[i]);
            }
        }
        if (d.prune) {
            if (!Array.isArray(d.prune))
                throw TypeError(".ControlMessage.prune: array expected");
            m.prune = [];
            for (var i = 0; i < d.prune.length; ++i) {
                if (typeof d.prune[i] !== "object")
                    throw TypeError(".ControlMessage.prune: object expected");
                m.prune[i] = $root.ControlPrune.fromObject(d.prune[i]);
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a ControlMessage message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ControlMessage
     * @static
     * @param {ControlMessage} m ControlMessage
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ControlMessage.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.ihave = [];
            d.iwant = [];
            d.graft = [];
            d.prune = [];
        }
        if (m.ihave && m.ihave.length) {
            d.ihave = [];
            for (var j = 0; j < m.ihave.length; ++j) {
                d.ihave[j] = $root.ControlIHave.toObject(m.ihave[j], o);
            }
        }
        if (m.iwant && m.iwant.length) {
            d.iwant = [];
            for (var j = 0; j < m.iwant.length; ++j) {
                d.iwant[j] = $root.ControlIWant.toObject(m.iwant[j], o);
            }
        }
        if (m.graft && m.graft.length) {
            d.graft = [];
            for (var j = 0; j < m.graft.length; ++j) {
                d.graft[j] = $root.ControlGraft.toObject(m.graft[j], o);
            }
        }
        if (m.prune && m.prune.length) {
            d.prune = [];
            for (var j = 0; j < m.prune.length; ++j) {
                d.prune[j] = $root.ControlPrune.toObject(m.prune[j], o);
            }
        }
        return d;
    };

    /**
     * Converts this ControlMessage to JSON.
     * @function toJSON
     * @memberof ControlMessage
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ControlMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ControlMessage;
})();

export const ControlIHave = $root.ControlIHave = (() => {

    /**
     * Properties of a ControlIHave.
     * @exports IControlIHave
     * @interface IControlIHave
     * @property {string|null} [topic] ControlIHave topic
     * @property {Array.<Uint8Array>|null} [messageIDs] ControlIHave messageIDs
     */

    /**
     * Constructs a new ControlIHave.
     * @exports ControlIHave
     * @classdesc Represents a ControlIHave.
     * @implements IControlIHave
     * @constructor
     * @param {IControlIHave=} [p] Properties to set
     */
    function ControlIHave(p) {
        this.messageIDs = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ControlIHave topic.
     * @member {string|null|undefined} topic
     * @memberof ControlIHave
     * @instance
     */
    ControlIHave.prototype.topic = null;

    /**
     * ControlIHave messageIDs.
     * @member {Array.<Uint8Array>} messageIDs
     * @memberof ControlIHave
     * @instance
     */
    ControlIHave.prototype.messageIDs = $util.emptyArray;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * ControlIHave _topic.
     * @member {"topic"|undefined} _topic
     * @memberof ControlIHave
     * @instance
     */
    Object.defineProperty(ControlIHave.prototype, "_topic", {
        get: $util.oneOfGetter($oneOfFields = ["topic"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified ControlIHave message. Does not implicitly {@link ControlIHave.verify|verify} messages.
     * @function encode
     * @memberof ControlIHave
     * @static
     * @param {IControlIHave} m ControlIHave message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ControlIHave.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.topic != null && Object.hasOwnProperty.call(m, "topic"))
            w.uint32(10).string(m.topic);
        if (m.messageIDs != null && m.messageIDs.length) {
            for (var i = 0; i < m.messageIDs.length; ++i)
                w.uint32(18).bytes(m.messageIDs[i]);
        }
        return w;
    };

    /**
     * Decodes a ControlIHave message from the specified reader or buffer.
     * @function decode
     * @memberof ControlIHave
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ControlIHave} ControlIHave
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ControlIHave.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ControlIHave();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.topic = r.string();
                break;
            case 2:
                if (!(m.messageIDs && m.messageIDs.length))
                    m.messageIDs = [];
                m.messageIDs.push(r.bytes());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a ControlIHave message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ControlIHave
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ControlIHave} ControlIHave
     */
    ControlIHave.fromObject = function fromObject(d) {
        if (d instanceof $root.ControlIHave)
            return d;
        var m = new $root.ControlIHave();
        if (d.topic != null) {
            m.topic = String(d.topic);
        }
        if (d.messageIDs) {
            if (!Array.isArray(d.messageIDs))
                throw TypeError(".ControlIHave.messageIDs: array expected");
            m.messageIDs = [];
            for (var i = 0; i < d.messageIDs.length; ++i) {
                if (typeof d.messageIDs[i] === "string")
                    $util.base64.decode(d.messageIDs[i], m.messageIDs[i] = $util.newBuffer($util.base64.length(d.messageIDs[i])), 0);
                else if (d.messageIDs[i].length)
                    m.messageIDs[i] = d.messageIDs[i];
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a ControlIHave message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ControlIHave
     * @static
     * @param {ControlIHave} m ControlIHave
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ControlIHave.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.messageIDs = [];
        }
        if (m.topic != null && m.hasOwnProperty("topic")) {
            d.topic = m.topic;
            if (o.oneofs)
                d._topic = "topic";
        }
        if (m.messageIDs && m.messageIDs.length) {
            d.messageIDs = [];
            for (var j = 0; j < m.messageIDs.length; ++j) {
                d.messageIDs[j] = o.bytes === String ? $util.base64.encode(m.messageIDs[j], 0, m.messageIDs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.messageIDs[j]) : m.messageIDs[j];
            }
        }
        return d;
    };

    /**
     * Converts this ControlIHave to JSON.
     * @function toJSON
     * @memberof ControlIHave
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ControlIHave.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ControlIHave;
})();

export const ControlIWant = $root.ControlIWant = (() => {

    /**
     * Properties of a ControlIWant.
     * @exports IControlIWant
     * @interface IControlIWant
     * @property {Array.<Uint8Array>|null} [messageIDs] ControlIWant messageIDs
     */

    /**
     * Constructs a new ControlIWant.
     * @exports ControlIWant
     * @classdesc Represents a ControlIWant.
     * @implements IControlIWant
     * @constructor
     * @param {IControlIWant=} [p] Properties to set
     */
    function ControlIWant(p) {
        this.messageIDs = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ControlIWant messageIDs.
     * @member {Array.<Uint8Array>} messageIDs
     * @memberof ControlIWant
     * @instance
     */
    ControlIWant.prototype.messageIDs = $util.emptyArray;

    /**
     * Encodes the specified ControlIWant message. Does not implicitly {@link ControlIWant.verify|verify} messages.
     * @function encode
     * @memberof ControlIWant
     * @static
     * @param {IControlIWant} m ControlIWant message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ControlIWant.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.messageIDs != null && m.messageIDs.length) {
            for (var i = 0; i < m.messageIDs.length; ++i)
                w.uint32(10).bytes(m.messageIDs[i]);
        }
        return w;
    };

    /**
     * Decodes a ControlIWant message from the specified reader or buffer.
     * @function decode
     * @memberof ControlIWant
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ControlIWant} ControlIWant
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ControlIWant.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ControlIWant();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                if (!(m.messageIDs && m.messageIDs.length))
                    m.messageIDs = [];
                m.messageIDs.push(r.bytes());
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a ControlIWant message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ControlIWant
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ControlIWant} ControlIWant
     */
    ControlIWant.fromObject = function fromObject(d) {
        if (d instanceof $root.ControlIWant)
            return d;
        var m = new $root.ControlIWant();
        if (d.messageIDs) {
            if (!Array.isArray(d.messageIDs))
                throw TypeError(".ControlIWant.messageIDs: array expected");
            m.messageIDs = [];
            for (var i = 0; i < d.messageIDs.length; ++i) {
                if (typeof d.messageIDs[i] === "string")
                    $util.base64.decode(d.messageIDs[i], m.messageIDs[i] = $util.newBuffer($util.base64.length(d.messageIDs[i])), 0);
                else if (d.messageIDs[i].length)
                    m.messageIDs[i] = d.messageIDs[i];
            }
        }
        return m;
    };

    /**
     * Creates a plain object from a ControlIWant message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ControlIWant
     * @static
     * @param {ControlIWant} m ControlIWant
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ControlIWant.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.messageIDs = [];
        }
        if (m.messageIDs && m.messageIDs.length) {
            d.messageIDs = [];
            for (var j = 0; j < m.messageIDs.length; ++j) {
                d.messageIDs[j] = o.bytes === String ? $util.base64.encode(m.messageIDs[j], 0, m.messageIDs[j].length) : o.bytes === Array ? Array.prototype.slice.call(m.messageIDs[j]) : m.messageIDs[j];
            }
        }
        return d;
    };

    /**
     * Converts this ControlIWant to JSON.
     * @function toJSON
     * @memberof ControlIWant
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ControlIWant.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ControlIWant;
})();

export const ControlGraft = $root.ControlGraft = (() => {

    /**
     * Properties of a ControlGraft.
     * @exports IControlGraft
     * @interface IControlGraft
     * @property {string|null} [topic] ControlGraft topic
     */

    /**
     * Constructs a new ControlGraft.
     * @exports ControlGraft
     * @classdesc Represents a ControlGraft.
     * @implements IControlGraft
     * @constructor
     * @param {IControlGraft=} [p] Properties to set
     */
    function ControlGraft(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ControlGraft topic.
     * @member {string|null|undefined} topic
     * @memberof ControlGraft
     * @instance
     */
    ControlGraft.prototype.topic = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * ControlGraft _topic.
     * @member {"topic"|undefined} _topic
     * @memberof ControlGraft
     * @instance
     */
    Object.defineProperty(ControlGraft.prototype, "_topic", {
        get: $util.oneOfGetter($oneOfFields = ["topic"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified ControlGraft message. Does not implicitly {@link ControlGraft.verify|verify} messages.
     * @function encode
     * @memberof ControlGraft
     * @static
     * @param {IControlGraft} m ControlGraft message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ControlGraft.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.topic != null && Object.hasOwnProperty.call(m, "topic"))
            w.uint32(10).string(m.topic);
        return w;
    };

    /**
     * Decodes a ControlGraft message from the specified reader or buffer.
     * @function decode
     * @memberof ControlGraft
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ControlGraft} ControlGraft
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ControlGraft.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ControlGraft();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.topic = r.string();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a ControlGraft message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ControlGraft
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ControlGraft} ControlGraft
     */
    ControlGraft.fromObject = function fromObject(d) {
        if (d instanceof $root.ControlGraft)
            return d;
        var m = new $root.ControlGraft();
        if (d.topic != null) {
            m.topic = String(d.topic);
        }
        return m;
    };

    /**
     * Creates a plain object from a ControlGraft message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ControlGraft
     * @static
     * @param {ControlGraft} m ControlGraft
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ControlGraft.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (m.topic != null && m.hasOwnProperty("topic")) {
            d.topic = m.topic;
            if (o.oneofs)
                d._topic = "topic";
        }
        return d;
    };

    /**
     * Converts this ControlGraft to JSON.
     * @function toJSON
     * @memberof ControlGraft
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ControlGraft.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ControlGraft;
})();

export const ControlPrune = $root.ControlPrune = (() => {

    /**
     * Properties of a ControlPrune.
     * @exports IControlPrune
     * @interface IControlPrune
     * @property {string|null} [topic] ControlPrune topic
     * @property {Array.<IPeerInfo>|null} [peers] ControlPrune peers
     * @property {number|null} [backoff] ControlPrune backoff
     */

    /**
     * Constructs a new ControlPrune.
     * @exports ControlPrune
     * @classdesc Represents a ControlPrune.
     * @implements IControlPrune
     * @constructor
     * @param {IControlPrune=} [p] Properties to set
     */
    function ControlPrune(p) {
        this.peers = [];
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * ControlPrune topic.
     * @member {string|null|undefined} topic
     * @memberof ControlPrune
     * @instance
     */
    ControlPrune.prototype.topic = null;

    /**
     * ControlPrune peers.
     * @member {Array.<IPeerInfo>} peers
     * @memberof ControlPrune
     * @instance
     */
    ControlPrune.prototype.peers = $util.emptyArray;

    /**
     * ControlPrune backoff.
     * @member {number|null|undefined} backoff
     * @memberof ControlPrune
     * @instance
     */
    ControlPrune.prototype.backoff = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * ControlPrune _topic.
     * @member {"topic"|undefined} _topic
     * @memberof ControlPrune
     * @instance
     */
    Object.defineProperty(ControlPrune.prototype, "_topic", {
        get: $util.oneOfGetter($oneOfFields = ["topic"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * ControlPrune _backoff.
     * @member {"backoff"|undefined} _backoff
     * @memberof ControlPrune
     * @instance
     */
    Object.defineProperty(ControlPrune.prototype, "_backoff", {
        get: $util.oneOfGetter($oneOfFields = ["backoff"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified ControlPrune message. Does not implicitly {@link ControlPrune.verify|verify} messages.
     * @function encode
     * @memberof ControlPrune
     * @static
     * @param {IControlPrune} m ControlPrune message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ControlPrune.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.topic != null && Object.hasOwnProperty.call(m, "topic"))
            w.uint32(10).string(m.topic);
        if (m.peers != null && m.peers.length) {
            for (var i = 0; i < m.peers.length; ++i)
                $root.PeerInfo.encode(m.peers[i], w.uint32(18).fork()).ldelim();
        }
        if (m.backoff != null && Object.hasOwnProperty.call(m, "backoff"))
            w.uint32(24).uint64(m.backoff);
        return w;
    };

    /**
     * Decodes a ControlPrune message from the specified reader or buffer.
     * @function decode
     * @memberof ControlPrune
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {ControlPrune} ControlPrune
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ControlPrune.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.ControlPrune();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.topic = r.string();
                break;
            case 2:
                if (!(m.peers && m.peers.length))
                    m.peers = [];
                m.peers.push($root.PeerInfo.decode(r, r.uint32()));
                break;
            case 3:
                m.backoff = r.uint64();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a ControlPrune message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ControlPrune
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {ControlPrune} ControlPrune
     */
    ControlPrune.fromObject = function fromObject(d) {
        if (d instanceof $root.ControlPrune)
            return d;
        var m = new $root.ControlPrune();
        if (d.topic != null) {
            m.topic = String(d.topic);
        }
        if (d.peers) {
            if (!Array.isArray(d.peers))
                throw TypeError(".ControlPrune.peers: array expected");
            m.peers = [];
            for (var i = 0; i < d.peers.length; ++i) {
                if (typeof d.peers[i] !== "object")
                    throw TypeError(".ControlPrune.peers: object expected");
                m.peers[i] = $root.PeerInfo.fromObject(d.peers[i]);
            }
        }
        if (d.backoff != null) {
            if ($util.Long)
                (m.backoff = $util.Long.fromValue(d.backoff)).unsigned = true;
            else if (typeof d.backoff === "string")
                m.backoff = parseInt(d.backoff, 10);
            else if (typeof d.backoff === "number")
                m.backoff = d.backoff;
            else if (typeof d.backoff === "object")
                m.backoff = new $util.LongBits(d.backoff.low >>> 0, d.backoff.high >>> 0).toNumber(true);
        }
        return m;
    };

    /**
     * Creates a plain object from a ControlPrune message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ControlPrune
     * @static
     * @param {ControlPrune} m ControlPrune
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ControlPrune.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.arrays || o.defaults) {
            d.peers = [];
        }
        if (m.topic != null && m.hasOwnProperty("topic")) {
            d.topic = m.topic;
            if (o.oneofs)
                d._topic = "topic";
        }
        if (m.peers && m.peers.length) {
            d.peers = [];
            for (var j = 0; j < m.peers.length; ++j) {
                d.peers[j] = $root.PeerInfo.toObject(m.peers[j], o);
            }
        }
        if (m.backoff != null && m.hasOwnProperty("backoff")) {
            if (typeof m.backoff === "number")
                d.backoff = o.longs === String ? String(m.backoff) : m.backoff;
            else
                d.backoff = o.longs === String ? $util.Long.prototype.toString.call(m.backoff) : o.longs === Number ? new $util.LongBits(m.backoff.low >>> 0, m.backoff.high >>> 0).toNumber(true) : m.backoff;
            if (o.oneofs)
                d._backoff = "backoff";
        }
        return d;
    };

    /**
     * Converts this ControlPrune to JSON.
     * @function toJSON
     * @memberof ControlPrune
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ControlPrune.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ControlPrune;
})();

export const PeerInfo = $root.PeerInfo = (() => {

    /**
     * Properties of a PeerInfo.
     * @exports IPeerInfo
     * @interface IPeerInfo
     * @property {Uint8Array|null} [peerID] PeerInfo peerID
     * @property {Uint8Array|null} [signedPeerRecord] PeerInfo signedPeerRecord
     */

    /**
     * Constructs a new PeerInfo.
     * @exports PeerInfo
     * @classdesc Represents a PeerInfo.
     * @implements IPeerInfo
     * @constructor
     * @param {IPeerInfo=} [p] Properties to set
     */
    function PeerInfo(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * PeerInfo peerID.
     * @member {Uint8Array|null|undefined} peerID
     * @memberof PeerInfo
     * @instance
     */
    PeerInfo.prototype.peerID = null;

    /**
     * PeerInfo signedPeerRecord.
     * @member {Uint8Array|null|undefined} signedPeerRecord
     * @memberof PeerInfo
     * @instance
     */
    PeerInfo.prototype.signedPeerRecord = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * PeerInfo _peerID.
     * @member {"peerID"|undefined} _peerID
     * @memberof PeerInfo
     * @instance
     */
    Object.defineProperty(PeerInfo.prototype, "_peerID", {
        get: $util.oneOfGetter($oneOfFields = ["peerID"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * PeerInfo _signedPeerRecord.
     * @member {"signedPeerRecord"|undefined} _signedPeerRecord
     * @memberof PeerInfo
     * @instance
     */
    Object.defineProperty(PeerInfo.prototype, "_signedPeerRecord", {
        get: $util.oneOfGetter($oneOfFields = ["signedPeerRecord"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Encodes the specified PeerInfo message. Does not implicitly {@link PeerInfo.verify|verify} messages.
     * @function encode
     * @memberof PeerInfo
     * @static
     * @param {IPeerInfo} m PeerInfo message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PeerInfo.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.peerID != null && Object.hasOwnProperty.call(m, "peerID"))
            w.uint32(10).bytes(m.peerID);
        if (m.signedPeerRecord != null && Object.hasOwnProperty.call(m, "signedPeerRecord"))
            w.uint32(18).bytes(m.signedPeerRecord);
        return w;
    };

    /**
     * Decodes a PeerInfo message from the specified reader or buffer.
     * @function decode
     * @memberof PeerInfo
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {PeerInfo} PeerInfo
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PeerInfo.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.PeerInfo();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.peerID = r.bytes();
                break;
            case 2:
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
     * Creates a PeerInfo message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PeerInfo
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {PeerInfo} PeerInfo
     */
    PeerInfo.fromObject = function fromObject(d) {
        if (d instanceof $root.PeerInfo)
            return d;
        var m = new $root.PeerInfo();
        if (d.peerID != null) {
            if (typeof d.peerID === "string")
                $util.base64.decode(d.peerID, m.peerID = $util.newBuffer($util.base64.length(d.peerID)), 0);
            else if (d.peerID.length)
                m.peerID = d.peerID;
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
     * Creates a plain object from a PeerInfo message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PeerInfo
     * @static
     * @param {PeerInfo} m PeerInfo
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PeerInfo.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (m.peerID != null && m.hasOwnProperty("peerID")) {
            d.peerID = o.bytes === String ? $util.base64.encode(m.peerID, 0, m.peerID.length) : o.bytes === Array ? Array.prototype.slice.call(m.peerID) : m.peerID;
            if (o.oneofs)
                d._peerID = "peerID";
        }
        if (m.signedPeerRecord != null && m.hasOwnProperty("signedPeerRecord")) {
            d.signedPeerRecord = o.bytes === String ? $util.base64.encode(m.signedPeerRecord, 0, m.signedPeerRecord.length) : o.bytes === Array ? Array.prototype.slice.call(m.signedPeerRecord) : m.signedPeerRecord;
            if (o.oneofs)
                d._signedPeerRecord = "signedPeerRecord";
        }
        return d;
    };

    /**
     * Converts this PeerInfo to JSON.
     * @function toJSON
     * @memberof PeerInfo
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PeerInfo.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PeerInfo;
})();

export { $root as default };
