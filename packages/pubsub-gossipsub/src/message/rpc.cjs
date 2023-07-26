// @ts-nocheck
/*eslint-disable*/
(function(global, factory) { /* global define, require, module */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobufjs/minimal"], factory);

    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/minimal"));

})(this, function($protobuf) {
    "use strict";

    // Common aliases
    var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

    // Exported root namespace
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

    $root.RPC = (function() {

        /**
         * Properties of a RPC.
         * @exports IRPC
         * @interface IRPC
         * @property {Array.<RPC.ISubOpts>|null} [subscriptions] RPC subscriptions
         * @property {Array.<RPC.IMessage>|null} [messages] RPC messages
         * @property {RPC.IControlMessage|null} [control] RPC control
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
         * @member {RPC.IControlMessage|null|undefined} control
         * @memberof RPC
         * @instance
         */
        RPC.prototype.control = null;

        // OneOf field names bound to virtual getters and setters
        var $oneOfFields;

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
                $root.RPC.ControlMessage.encode(m.control, w.uint32(26).fork()).ldelim();
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
                    m.control = $root.RPC.ControlMessage.decode(r, r.uint32());
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
                m.control = $root.RPC.ControlMessage.fromObject(d.control);
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
                d.control = $root.RPC.ControlMessage.toObject(m.control, o);
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
            var $oneOfFields;

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
             * @property {Uint8Array|null} [seqno] Message seqno
             * @property {string} topic Message topic
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
             * Message seqno.
             * @member {Uint8Array|null|undefined} seqno
             * @memberof RPC.Message
             * @instance
             */
            Message.prototype.seqno = null;

            /**
             * Message topic.
             * @member {string} topic
             * @memberof RPC.Message
             * @instance
             */
            Message.prototype.topic = "";

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
            var $oneOfFields;

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
             * Message _seqno.
             * @member {"seqno"|undefined} _seqno
             * @memberof RPC.Message
             * @instance
             */
            Object.defineProperty(Message.prototype, "_seqno", {
                get: $util.oneOfGetter($oneOfFields = ["seqno"]),
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
                if (m.seqno != null && Object.hasOwnProperty.call(m, "seqno"))
                    w.uint32(26).bytes(m.seqno);
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
                        m.seqno = r.bytes();
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
                if (!m.hasOwnProperty("topic"))
                    throw $util.ProtocolError("missing required 'topic'", { instance: m });
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
                if (d.seqno != null) {
                    if (typeof d.seqno === "string")
                        $util.base64.decode(d.seqno, m.seqno = $util.newBuffer($util.base64.length(d.seqno)), 0);
                    else if (d.seqno.length)
                        m.seqno = d.seqno;
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
                if (o.defaults) {
                    d.topic = "";
                }
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
                if (m.seqno != null && m.hasOwnProperty("seqno")) {
                    d.seqno = o.bytes === String ? $util.base64.encode(m.seqno, 0, m.seqno.length) : o.bytes === Array ? Array.prototype.slice.call(m.seqno) : m.seqno;
                    if (o.oneofs)
                        d._seqno = "seqno";
                }
                if (m.topic != null && m.hasOwnProperty("topic")) {
                    d.topic = m.topic;
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

        RPC.ControlMessage = (function() {

            /**
             * Properties of a ControlMessage.
             * @memberof RPC
             * @interface IControlMessage
             * @property {Array.<RPC.IControlIHave>|null} [ihave] ControlMessage ihave
             * @property {Array.<RPC.IControlIWant>|null} [iwant] ControlMessage iwant
             * @property {Array.<RPC.IControlGraft>|null} [graft] ControlMessage graft
             * @property {Array.<RPC.IControlPrune>|null} [prune] ControlMessage prune
             */

            /**
             * Constructs a new ControlMessage.
             * @memberof RPC
             * @classdesc Represents a ControlMessage.
             * @implements IControlMessage
             * @constructor
             * @param {RPC.IControlMessage=} [p] Properties to set
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
             * @member {Array.<RPC.IControlIHave>} ihave
             * @memberof RPC.ControlMessage
             * @instance
             */
            ControlMessage.prototype.ihave = $util.emptyArray;

            /**
             * ControlMessage iwant.
             * @member {Array.<RPC.IControlIWant>} iwant
             * @memberof RPC.ControlMessage
             * @instance
             */
            ControlMessage.prototype.iwant = $util.emptyArray;

            /**
             * ControlMessage graft.
             * @member {Array.<RPC.IControlGraft>} graft
             * @memberof RPC.ControlMessage
             * @instance
             */
            ControlMessage.prototype.graft = $util.emptyArray;

            /**
             * ControlMessage prune.
             * @member {Array.<RPC.IControlPrune>} prune
             * @memberof RPC.ControlMessage
             * @instance
             */
            ControlMessage.prototype.prune = $util.emptyArray;

            /**
             * Encodes the specified ControlMessage message. Does not implicitly {@link RPC.ControlMessage.verify|verify} messages.
             * @function encode
             * @memberof RPC.ControlMessage
             * @static
             * @param {RPC.IControlMessage} m ControlMessage message or plain object to encode
             * @param {$protobuf.Writer} [w] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ControlMessage.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.ihave != null && m.ihave.length) {
                    for (var i = 0; i < m.ihave.length; ++i)
                        $root.RPC.ControlIHave.encode(m.ihave[i], w.uint32(10).fork()).ldelim();
                }
                if (m.iwant != null && m.iwant.length) {
                    for (var i = 0; i < m.iwant.length; ++i)
                        $root.RPC.ControlIWant.encode(m.iwant[i], w.uint32(18).fork()).ldelim();
                }
                if (m.graft != null && m.graft.length) {
                    for (var i = 0; i < m.graft.length; ++i)
                        $root.RPC.ControlGraft.encode(m.graft[i], w.uint32(26).fork()).ldelim();
                }
                if (m.prune != null && m.prune.length) {
                    for (var i = 0; i < m.prune.length; ++i)
                        $root.RPC.ControlPrune.encode(m.prune[i], w.uint32(34).fork()).ldelim();
                }
                return w;
            };

            /**
             * Decodes a ControlMessage message from the specified reader or buffer.
             * @function decode
             * @memberof RPC.ControlMessage
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.ControlMessage} ControlMessage
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ControlMessage.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.ControlMessage();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1:
                        if (!(m.ihave && m.ihave.length))
                            m.ihave = [];
                        m.ihave.push($root.RPC.ControlIHave.decode(r, r.uint32()));
                        break;
                    case 2:
                        if (!(m.iwant && m.iwant.length))
                            m.iwant = [];
                        m.iwant.push($root.RPC.ControlIWant.decode(r, r.uint32()));
                        break;
                    case 3:
                        if (!(m.graft && m.graft.length))
                            m.graft = [];
                        m.graft.push($root.RPC.ControlGraft.decode(r, r.uint32()));
                        break;
                    case 4:
                        if (!(m.prune && m.prune.length))
                            m.prune = [];
                        m.prune.push($root.RPC.ControlPrune.decode(r, r.uint32()));
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
             * @memberof RPC.ControlMessage
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.ControlMessage} ControlMessage
             */
            ControlMessage.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.ControlMessage)
                    return d;
                var m = new $root.RPC.ControlMessage();
                if (d.ihave) {
                    if (!Array.isArray(d.ihave))
                        throw TypeError(".RPC.ControlMessage.ihave: array expected");
                    m.ihave = [];
                    for (var i = 0; i < d.ihave.length; ++i) {
                        if (typeof d.ihave[i] !== "object")
                            throw TypeError(".RPC.ControlMessage.ihave: object expected");
                        m.ihave[i] = $root.RPC.ControlIHave.fromObject(d.ihave[i]);
                    }
                }
                if (d.iwant) {
                    if (!Array.isArray(d.iwant))
                        throw TypeError(".RPC.ControlMessage.iwant: array expected");
                    m.iwant = [];
                    for (var i = 0; i < d.iwant.length; ++i) {
                        if (typeof d.iwant[i] !== "object")
                            throw TypeError(".RPC.ControlMessage.iwant: object expected");
                        m.iwant[i] = $root.RPC.ControlIWant.fromObject(d.iwant[i]);
                    }
                }
                if (d.graft) {
                    if (!Array.isArray(d.graft))
                        throw TypeError(".RPC.ControlMessage.graft: array expected");
                    m.graft = [];
                    for (var i = 0; i < d.graft.length; ++i) {
                        if (typeof d.graft[i] !== "object")
                            throw TypeError(".RPC.ControlMessage.graft: object expected");
                        m.graft[i] = $root.RPC.ControlGraft.fromObject(d.graft[i]);
                    }
                }
                if (d.prune) {
                    if (!Array.isArray(d.prune))
                        throw TypeError(".RPC.ControlMessage.prune: array expected");
                    m.prune = [];
                    for (var i = 0; i < d.prune.length; ++i) {
                        if (typeof d.prune[i] !== "object")
                            throw TypeError(".RPC.ControlMessage.prune: object expected");
                        m.prune[i] = $root.RPC.ControlPrune.fromObject(d.prune[i]);
                    }
                }
                return m;
            };

            /**
             * Creates a plain object from a ControlMessage message. Also converts values to other types if specified.
             * @function toObject
             * @memberof RPC.ControlMessage
             * @static
             * @param {RPC.ControlMessage} m ControlMessage
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
                        d.ihave[j] = $root.RPC.ControlIHave.toObject(m.ihave[j], o);
                    }
                }
                if (m.iwant && m.iwant.length) {
                    d.iwant = [];
                    for (var j = 0; j < m.iwant.length; ++j) {
                        d.iwant[j] = $root.RPC.ControlIWant.toObject(m.iwant[j], o);
                    }
                }
                if (m.graft && m.graft.length) {
                    d.graft = [];
                    for (var j = 0; j < m.graft.length; ++j) {
                        d.graft[j] = $root.RPC.ControlGraft.toObject(m.graft[j], o);
                    }
                }
                if (m.prune && m.prune.length) {
                    d.prune = [];
                    for (var j = 0; j < m.prune.length; ++j) {
                        d.prune[j] = $root.RPC.ControlPrune.toObject(m.prune[j], o);
                    }
                }
                return d;
            };

            /**
             * Converts this ControlMessage to JSON.
             * @function toJSON
             * @memberof RPC.ControlMessage
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ControlMessage.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ControlMessage;
        })();

        RPC.ControlIHave = (function() {

            /**
             * Properties of a ControlIHave.
             * @memberof RPC
             * @interface IControlIHave
             * @property {string|null} [topicID] ControlIHave topicID
             * @property {Array.<Uint8Array>|null} [messageIDs] ControlIHave messageIDs
             */

            /**
             * Constructs a new ControlIHave.
             * @memberof RPC
             * @classdesc Represents a ControlIHave.
             * @implements IControlIHave
             * @constructor
             * @param {RPC.IControlIHave=} [p] Properties to set
             */
            function ControlIHave(p) {
                this.messageIDs = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            /**
             * ControlIHave topicID.
             * @member {string|null|undefined} topicID
             * @memberof RPC.ControlIHave
             * @instance
             */
            ControlIHave.prototype.topicID = null;

            /**
             * ControlIHave messageIDs.
             * @member {Array.<Uint8Array>} messageIDs
             * @memberof RPC.ControlIHave
             * @instance
             */
            ControlIHave.prototype.messageIDs = $util.emptyArray;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * ControlIHave _topicID.
             * @member {"topicID"|undefined} _topicID
             * @memberof RPC.ControlIHave
             * @instance
             */
            Object.defineProperty(ControlIHave.prototype, "_topicID", {
                get: $util.oneOfGetter($oneOfFields = ["topicID"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ControlIHave message. Does not implicitly {@link RPC.ControlIHave.verify|verify} messages.
             * @function encode
             * @memberof RPC.ControlIHave
             * @static
             * @param {RPC.IControlIHave} m ControlIHave message or plain object to encode
             * @param {$protobuf.Writer} [w] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ControlIHave.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.topicID != null && Object.hasOwnProperty.call(m, "topicID"))
                    w.uint32(10).string(m.topicID);
                if (m.messageIDs != null && m.messageIDs.length) {
                    for (var i = 0; i < m.messageIDs.length; ++i)
                        w.uint32(18).bytes(m.messageIDs[i]);
                }
                return w;
            };

            /**
             * Decodes a ControlIHave message from the specified reader or buffer.
             * @function decode
             * @memberof RPC.ControlIHave
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.ControlIHave} ControlIHave
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ControlIHave.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.ControlIHave();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1:
                        m.topicID = r.string();
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
             * @memberof RPC.ControlIHave
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.ControlIHave} ControlIHave
             */
            ControlIHave.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.ControlIHave)
                    return d;
                var m = new $root.RPC.ControlIHave();
                if (d.topicID != null) {
                    m.topicID = String(d.topicID);
                }
                if (d.messageIDs) {
                    if (!Array.isArray(d.messageIDs))
                        throw TypeError(".RPC.ControlIHave.messageIDs: array expected");
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
             * @memberof RPC.ControlIHave
             * @static
             * @param {RPC.ControlIHave} m ControlIHave
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
                if (m.topicID != null && m.hasOwnProperty("topicID")) {
                    d.topicID = m.topicID;
                    if (o.oneofs)
                        d._topicID = "topicID";
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
             * @memberof RPC.ControlIHave
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ControlIHave.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ControlIHave;
        })();

        RPC.ControlIWant = (function() {

            /**
             * Properties of a ControlIWant.
             * @memberof RPC
             * @interface IControlIWant
             * @property {Array.<Uint8Array>|null} [messageIDs] ControlIWant messageIDs
             */

            /**
             * Constructs a new ControlIWant.
             * @memberof RPC
             * @classdesc Represents a ControlIWant.
             * @implements IControlIWant
             * @constructor
             * @param {RPC.IControlIWant=} [p] Properties to set
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
             * @memberof RPC.ControlIWant
             * @instance
             */
            ControlIWant.prototype.messageIDs = $util.emptyArray;

            /**
             * Encodes the specified ControlIWant message. Does not implicitly {@link RPC.ControlIWant.verify|verify} messages.
             * @function encode
             * @memberof RPC.ControlIWant
             * @static
             * @param {RPC.IControlIWant} m ControlIWant message or plain object to encode
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
             * @memberof RPC.ControlIWant
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.ControlIWant} ControlIWant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ControlIWant.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.ControlIWant();
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
             * @memberof RPC.ControlIWant
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.ControlIWant} ControlIWant
             */
            ControlIWant.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.ControlIWant)
                    return d;
                var m = new $root.RPC.ControlIWant();
                if (d.messageIDs) {
                    if (!Array.isArray(d.messageIDs))
                        throw TypeError(".RPC.ControlIWant.messageIDs: array expected");
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
             * @memberof RPC.ControlIWant
             * @static
             * @param {RPC.ControlIWant} m ControlIWant
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
             * @memberof RPC.ControlIWant
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ControlIWant.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ControlIWant;
        })();

        RPC.ControlGraft = (function() {

            /**
             * Properties of a ControlGraft.
             * @memberof RPC
             * @interface IControlGraft
             * @property {string|null} [topicID] ControlGraft topicID
             */

            /**
             * Constructs a new ControlGraft.
             * @memberof RPC
             * @classdesc Represents a ControlGraft.
             * @implements IControlGraft
             * @constructor
             * @param {RPC.IControlGraft=} [p] Properties to set
             */
            function ControlGraft(p) {
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            /**
             * ControlGraft topicID.
             * @member {string|null|undefined} topicID
             * @memberof RPC.ControlGraft
             * @instance
             */
            ControlGraft.prototype.topicID = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * ControlGraft _topicID.
             * @member {"topicID"|undefined} _topicID
             * @memberof RPC.ControlGraft
             * @instance
             */
            Object.defineProperty(ControlGraft.prototype, "_topicID", {
                get: $util.oneOfGetter($oneOfFields = ["topicID"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ControlGraft message. Does not implicitly {@link RPC.ControlGraft.verify|verify} messages.
             * @function encode
             * @memberof RPC.ControlGraft
             * @static
             * @param {RPC.IControlGraft} m ControlGraft message or plain object to encode
             * @param {$protobuf.Writer} [w] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ControlGraft.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.topicID != null && Object.hasOwnProperty.call(m, "topicID"))
                    w.uint32(10).string(m.topicID);
                return w;
            };

            /**
             * Decodes a ControlGraft message from the specified reader or buffer.
             * @function decode
             * @memberof RPC.ControlGraft
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.ControlGraft} ControlGraft
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ControlGraft.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.ControlGraft();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1:
                        m.topicID = r.string();
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
             * @memberof RPC.ControlGraft
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.ControlGraft} ControlGraft
             */
            ControlGraft.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.ControlGraft)
                    return d;
                var m = new $root.RPC.ControlGraft();
                if (d.topicID != null) {
                    m.topicID = String(d.topicID);
                }
                return m;
            };

            /**
             * Creates a plain object from a ControlGraft message. Also converts values to other types if specified.
             * @function toObject
             * @memberof RPC.ControlGraft
             * @static
             * @param {RPC.ControlGraft} m ControlGraft
             * @param {$protobuf.IConversionOptions} [o] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            ControlGraft.toObject = function toObject(m, o) {
                if (!o)
                    o = {};
                var d = {};
                if (m.topicID != null && m.hasOwnProperty("topicID")) {
                    d.topicID = m.topicID;
                    if (o.oneofs)
                        d._topicID = "topicID";
                }
                return d;
            };

            /**
             * Converts this ControlGraft to JSON.
             * @function toJSON
             * @memberof RPC.ControlGraft
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ControlGraft.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ControlGraft;
        })();

        RPC.ControlPrune = (function() {

            /**
             * Properties of a ControlPrune.
             * @memberof RPC
             * @interface IControlPrune
             * @property {string|null} [topicID] ControlPrune topicID
             * @property {Array.<RPC.IPeerInfo>|null} [peers] ControlPrune peers
             * @property {number|null} [backoff] ControlPrune backoff
             */

            /**
             * Constructs a new ControlPrune.
             * @memberof RPC
             * @classdesc Represents a ControlPrune.
             * @implements IControlPrune
             * @constructor
             * @param {RPC.IControlPrune=} [p] Properties to set
             */
            function ControlPrune(p) {
                this.peers = [];
                if (p)
                    for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                        if (p[ks[i]] != null)
                            this[ks[i]] = p[ks[i]];
            }

            /**
             * ControlPrune topicID.
             * @member {string|null|undefined} topicID
             * @memberof RPC.ControlPrune
             * @instance
             */
            ControlPrune.prototype.topicID = null;

            /**
             * ControlPrune peers.
             * @member {Array.<RPC.IPeerInfo>} peers
             * @memberof RPC.ControlPrune
             * @instance
             */
            ControlPrune.prototype.peers = $util.emptyArray;

            /**
             * ControlPrune backoff.
             * @member {number|null|undefined} backoff
             * @memberof RPC.ControlPrune
             * @instance
             */
            ControlPrune.prototype.backoff = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * ControlPrune _topicID.
             * @member {"topicID"|undefined} _topicID
             * @memberof RPC.ControlPrune
             * @instance
             */
            Object.defineProperty(ControlPrune.prototype, "_topicID", {
                get: $util.oneOfGetter($oneOfFields = ["topicID"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * ControlPrune _backoff.
             * @member {"backoff"|undefined} _backoff
             * @memberof RPC.ControlPrune
             * @instance
             */
            Object.defineProperty(ControlPrune.prototype, "_backoff", {
                get: $util.oneOfGetter($oneOfFields = ["backoff"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ControlPrune message. Does not implicitly {@link RPC.ControlPrune.verify|verify} messages.
             * @function encode
             * @memberof RPC.ControlPrune
             * @static
             * @param {RPC.IControlPrune} m ControlPrune message or plain object to encode
             * @param {$protobuf.Writer} [w] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ControlPrune.encode = function encode(m, w) {
                if (!w)
                    w = $Writer.create();
                if (m.topicID != null && Object.hasOwnProperty.call(m, "topicID"))
                    w.uint32(10).string(m.topicID);
                if (m.peers != null && m.peers.length) {
                    for (var i = 0; i < m.peers.length; ++i)
                        $root.RPC.PeerInfo.encode(m.peers[i], w.uint32(18).fork()).ldelim();
                }
                if (m.backoff != null && Object.hasOwnProperty.call(m, "backoff"))
                    w.uint32(24).uint64(m.backoff);
                return w;
            };

            /**
             * Decodes a ControlPrune message from the specified reader or buffer.
             * @function decode
             * @memberof RPC.ControlPrune
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.ControlPrune} ControlPrune
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ControlPrune.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.ControlPrune();
                while (r.pos < c) {
                    var t = r.uint32();
                    switch (t >>> 3) {
                    case 1:
                        m.topicID = r.string();
                        break;
                    case 2:
                        if (!(m.peers && m.peers.length))
                            m.peers = [];
                        m.peers.push($root.RPC.PeerInfo.decode(r, r.uint32()));
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
             * @memberof RPC.ControlPrune
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.ControlPrune} ControlPrune
             */
            ControlPrune.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.ControlPrune)
                    return d;
                var m = new $root.RPC.ControlPrune();
                if (d.topicID != null) {
                    m.topicID = String(d.topicID);
                }
                if (d.peers) {
                    if (!Array.isArray(d.peers))
                        throw TypeError(".RPC.ControlPrune.peers: array expected");
                    m.peers = [];
                    for (var i = 0; i < d.peers.length; ++i) {
                        if (typeof d.peers[i] !== "object")
                            throw TypeError(".RPC.ControlPrune.peers: object expected");
                        m.peers[i] = $root.RPC.PeerInfo.fromObject(d.peers[i]);
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
             * @memberof RPC.ControlPrune
             * @static
             * @param {RPC.ControlPrune} m ControlPrune
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
                if (m.topicID != null && m.hasOwnProperty("topicID")) {
                    d.topicID = m.topicID;
                    if (o.oneofs)
                        d._topicID = "topicID";
                }
                if (m.peers && m.peers.length) {
                    d.peers = [];
                    for (var j = 0; j < m.peers.length; ++j) {
                        d.peers[j] = $root.RPC.PeerInfo.toObject(m.peers[j], o);
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
             * @memberof RPC.ControlPrune
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            ControlPrune.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return ControlPrune;
        })();

        RPC.PeerInfo = (function() {

            /**
             * Properties of a PeerInfo.
             * @memberof RPC
             * @interface IPeerInfo
             * @property {Uint8Array|null} [peerID] PeerInfo peerID
             * @property {Uint8Array|null} [signedPeerRecord] PeerInfo signedPeerRecord
             */

            /**
             * Constructs a new PeerInfo.
             * @memberof RPC
             * @classdesc Represents a PeerInfo.
             * @implements IPeerInfo
             * @constructor
             * @param {RPC.IPeerInfo=} [p] Properties to set
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
             * @memberof RPC.PeerInfo
             * @instance
             */
            PeerInfo.prototype.peerID = null;

            /**
             * PeerInfo signedPeerRecord.
             * @member {Uint8Array|null|undefined} signedPeerRecord
             * @memberof RPC.PeerInfo
             * @instance
             */
            PeerInfo.prototype.signedPeerRecord = null;

            // OneOf field names bound to virtual getters and setters
            var $oneOfFields;

            /**
             * PeerInfo _peerID.
             * @member {"peerID"|undefined} _peerID
             * @memberof RPC.PeerInfo
             * @instance
             */
            Object.defineProperty(PeerInfo.prototype, "_peerID", {
                get: $util.oneOfGetter($oneOfFields = ["peerID"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * PeerInfo _signedPeerRecord.
             * @member {"signedPeerRecord"|undefined} _signedPeerRecord
             * @memberof RPC.PeerInfo
             * @instance
             */
            Object.defineProperty(PeerInfo.prototype, "_signedPeerRecord", {
                get: $util.oneOfGetter($oneOfFields = ["signedPeerRecord"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified PeerInfo message. Does not implicitly {@link RPC.PeerInfo.verify|verify} messages.
             * @function encode
             * @memberof RPC.PeerInfo
             * @static
             * @param {RPC.IPeerInfo} m PeerInfo message or plain object to encode
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
             * @memberof RPC.PeerInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
             * @param {number} [l] Message length if known beforehand
             * @returns {RPC.PeerInfo} PeerInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            PeerInfo.decode = function decode(r, l) {
                if (!(r instanceof $Reader))
                    r = $Reader.create(r);
                var c = l === undefined ? r.len : r.pos + l, m = new $root.RPC.PeerInfo();
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
             * @memberof RPC.PeerInfo
             * @static
             * @param {Object.<string,*>} d Plain object
             * @returns {RPC.PeerInfo} PeerInfo
             */
            PeerInfo.fromObject = function fromObject(d) {
                if (d instanceof $root.RPC.PeerInfo)
                    return d;
                var m = new $root.RPC.PeerInfo();
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
             * @memberof RPC.PeerInfo
             * @static
             * @param {RPC.PeerInfo} m PeerInfo
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
             * @memberof RPC.PeerInfo
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            PeerInfo.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            return PeerInfo;
        })();

        return RPC;
    })();

    return $root;
});
