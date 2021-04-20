/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-record"] || ($protobuf.roots["libp2p-record"] = {});

$root.Record = (function() {

    /**
     * Properties of a Record.
     * @exports IRecord
     * @interface IRecord
     * @property {Uint8Array|null} [key] Record key
     * @property {Uint8Array|null} [value] Record value
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
     * @member {Uint8Array} key
     * @memberof Record
     * @instance
     */
    Record.prototype.key = $util.newBuffer([]);

    /**
     * Record value.
     * @member {Uint8Array} value
     * @memberof Record
     * @instance
     */
    Record.prototype.value = $util.newBuffer([]);

    /**
     * Record timeReceived.
     * @member {string} timeReceived
     * @memberof Record
     * @instance
     */
    Record.prototype.timeReceived = "";

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
        if (o.defaults) {
            if (o.bytes === String)
                d.key = "";
            else {
                d.key = [];
                if (o.bytes !== Array)
                    d.key = $util.newBuffer(d.key);
            }
            if (o.bytes === String)
                d.value = "";
            else {
                d.value = [];
                if (o.bytes !== Array)
                    d.value = $util.newBuffer(d.value);
            }
            d.timeReceived = "";
        }
        if (m.key != null && m.hasOwnProperty("key")) {
            d.key = o.bytes === String ? $util.base64.encode(m.key, 0, m.key.length) : o.bytes === Array ? Array.prototype.slice.call(m.key) : m.key;
        }
        if (m.value != null && m.hasOwnProperty("value")) {
            d.value = o.bytes === String ? $util.base64.encode(m.value, 0, m.value.length) : o.bytes === Array ? Array.prototype.slice.call(m.value) : m.value;
        }
        if (m.timeReceived != null && m.hasOwnProperty("timeReceived")) {
            d.timeReceived = m.timeReceived;
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

module.exports = $root;
