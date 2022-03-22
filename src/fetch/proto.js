/*eslint-disable*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["libp2p-fetch"] || ($protobuf.roots["libp2p-fetch"] = {});

$root.FetchRequest = (function() {

    /**
     * Properties of a FetchRequest.
     * @exports IFetchRequest
     * @interface IFetchRequest
     * @property {string|null} [identifier] FetchRequest identifier
     */

    /**
     * Constructs a new FetchRequest.
     * @exports FetchRequest
     * @classdesc Represents a FetchRequest.
     * @implements IFetchRequest
     * @constructor
     * @param {IFetchRequest=} [p] Properties to set
     */
    function FetchRequest(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * FetchRequest identifier.
     * @member {string} identifier
     * @memberof FetchRequest
     * @instance
     */
    FetchRequest.prototype.identifier = "";

    /**
     * Encodes the specified FetchRequest message. Does not implicitly {@link FetchRequest.verify|verify} messages.
     * @function encode
     * @memberof FetchRequest
     * @static
     * @param {IFetchRequest} m FetchRequest message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FetchRequest.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.identifier != null && Object.hasOwnProperty.call(m, "identifier"))
            w.uint32(10).string(m.identifier);
        return w;
    };

    /**
     * Decodes a FetchRequest message from the specified reader or buffer.
     * @function decode
     * @memberof FetchRequest
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {FetchRequest} FetchRequest
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FetchRequest.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.FetchRequest();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.identifier = r.string();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a FetchRequest message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FetchRequest
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {FetchRequest} FetchRequest
     */
    FetchRequest.fromObject = function fromObject(d) {
        if (d instanceof $root.FetchRequest)
            return d;
        var m = new $root.FetchRequest();
        if (d.identifier != null) {
            m.identifier = String(d.identifier);
        }
        return m;
    };

    /**
     * Creates a plain object from a FetchRequest message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FetchRequest
     * @static
     * @param {FetchRequest} m FetchRequest
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FetchRequest.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.identifier = "";
        }
        if (m.identifier != null && m.hasOwnProperty("identifier")) {
            d.identifier = m.identifier;
        }
        return d;
    };

    /**
     * Converts this FetchRequest to JSON.
     * @function toJSON
     * @memberof FetchRequest
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FetchRequest.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return FetchRequest;
})();

$root.FetchResponse = (function() {

    /**
     * Properties of a FetchResponse.
     * @exports IFetchResponse
     * @interface IFetchResponse
     * @property {FetchResponse.StatusCode|null} [status] FetchResponse status
     * @property {Uint8Array|null} [data] FetchResponse data
     */

    /**
     * Constructs a new FetchResponse.
     * @exports FetchResponse
     * @classdesc Represents a FetchResponse.
     * @implements IFetchResponse
     * @constructor
     * @param {IFetchResponse=} [p] Properties to set
     */
    function FetchResponse(p) {
        if (p)
            for (var ks = Object.keys(p), i = 0; i < ks.length; ++i)
                if (p[ks[i]] != null)
                    this[ks[i]] = p[ks[i]];
    }

    /**
     * FetchResponse status.
     * @member {FetchResponse.StatusCode} status
     * @memberof FetchResponse
     * @instance
     */
    FetchResponse.prototype.status = 0;

    /**
     * FetchResponse data.
     * @member {Uint8Array} data
     * @memberof FetchResponse
     * @instance
     */
    FetchResponse.prototype.data = $util.newBuffer([]);

    /**
     * Encodes the specified FetchResponse message. Does not implicitly {@link FetchResponse.verify|verify} messages.
     * @function encode
     * @memberof FetchResponse
     * @static
     * @param {IFetchResponse} m FetchResponse message or plain object to encode
     * @param {$protobuf.Writer} [w] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FetchResponse.encode = function encode(m, w) {
        if (!w)
            w = $Writer.create();
        if (m.status != null && Object.hasOwnProperty.call(m, "status"))
            w.uint32(8).int32(m.status);
        if (m.data != null && Object.hasOwnProperty.call(m, "data"))
            w.uint32(18).bytes(m.data);
        return w;
    };

    /**
     * Decodes a FetchResponse message from the specified reader or buffer.
     * @function decode
     * @memberof FetchResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} r Reader or buffer to decode from
     * @param {number} [l] Message length if known beforehand
     * @returns {FetchResponse} FetchResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FetchResponse.decode = function decode(r, l) {
        if (!(r instanceof $Reader))
            r = $Reader.create(r);
        var c = l === undefined ? r.len : r.pos + l, m = new $root.FetchResponse();
        while (r.pos < c) {
            var t = r.uint32();
            switch (t >>> 3) {
            case 1:
                m.status = r.int32();
                break;
            case 2:
                m.data = r.bytes();
                break;
            default:
                r.skipType(t & 7);
                break;
            }
        }
        return m;
    };

    /**
     * Creates a FetchResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FetchResponse
     * @static
     * @param {Object.<string,*>} d Plain object
     * @returns {FetchResponse} FetchResponse
     */
    FetchResponse.fromObject = function fromObject(d) {
        if (d instanceof $root.FetchResponse)
            return d;
        var m = new $root.FetchResponse();
        switch (d.status) {
        case "OK":
        case 0:
            m.status = 0;
            break;
        case "NOT_FOUND":
        case 1:
            m.status = 1;
            break;
        case "ERROR":
        case 2:
            m.status = 2;
            break;
        }
        if (d.data != null) {
            if (typeof d.data === "string")
                $util.base64.decode(d.data, m.data = $util.newBuffer($util.base64.length(d.data)), 0);
            else if (d.data.length)
                m.data = d.data;
        }
        return m;
    };

    /**
     * Creates a plain object from a FetchResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FetchResponse
     * @static
     * @param {FetchResponse} m FetchResponse
     * @param {$protobuf.IConversionOptions} [o] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FetchResponse.toObject = function toObject(m, o) {
        if (!o)
            o = {};
        var d = {};
        if (o.defaults) {
            d.status = o.enums === String ? "OK" : 0;
            if (o.bytes === String)
                d.data = "";
            else {
                d.data = [];
                if (o.bytes !== Array)
                    d.data = $util.newBuffer(d.data);
            }
        }
        if (m.status != null && m.hasOwnProperty("status")) {
            d.status = o.enums === String ? $root.FetchResponse.StatusCode[m.status] : m.status;
        }
        if (m.data != null && m.hasOwnProperty("data")) {
            d.data = o.bytes === String ? $util.base64.encode(m.data, 0, m.data.length) : o.bytes === Array ? Array.prototype.slice.call(m.data) : m.data;
        }
        return d;
    };

    /**
     * Converts this FetchResponse to JSON.
     * @function toJSON
     * @memberof FetchResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FetchResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * StatusCode enum.
     * @name FetchResponse.StatusCode
     * @enum {number}
     * @property {number} OK=0 OK value
     * @property {number} NOT_FOUND=1 NOT_FOUND value
     * @property {number} ERROR=2 ERROR value
     */
    FetchResponse.StatusCode = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "OK"] = 0;
        values[valuesById[1] = "NOT_FOUND"] = 1;
        values[valuesById[2] = "ERROR"] = 2;
        return values;
    })();

    return FetchResponse;
})();

module.exports = $root;
