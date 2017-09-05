/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

/**
 * KeyType enum.
 * @exports KeyType
 * @enum {string}
 * @property {number} RSA=0 RSA value
 * @property {number} Ed25519=1 Ed25519 value
 * @property {number} Secp256k1=2 Secp256k1 value
 */
$root.KeyType = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "RSA"] = 0;
    values[valuesById[1] = "Ed25519"] = 1;
    values[valuesById[2] = "Secp256k1"] = 2;
    return values;
})();

$root.PublicKey = (function() {

    /**
     * Properties of a PublicKey.
     * @exports IPublicKey
     * @interface IPublicKey
     * @property {KeyType} Type PublicKey Type
     * @property {Uint8Array} Data PublicKey Data
     */

    /**
     * Constructs a new PublicKey.
     * @exports PublicKey
     * @classdesc Represents a PublicKey.
     * @constructor
     * @param {IPublicKey=} [properties] Properties to set
     */
    function PublicKey(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * PublicKey Type.
     * @member {KeyType}Type
     * @memberof PublicKey
     * @instance
     */
    PublicKey.prototype.Type = 0;

    /**
     * PublicKey Data.
     * @member {Uint8Array}Data
     * @memberof PublicKey
     * @instance
     */
    PublicKey.prototype.Data = $util.newBuffer([]);

    /**
     * Creates a new PublicKey instance using the specified properties.
     * @function create
     * @memberof PublicKey
     * @static
     * @param {IPublicKey=} [properties] Properties to set
     * @returns {PublicKey} PublicKey instance
     */
    PublicKey.create = function create(properties) {
        return new PublicKey(properties);
    };

    /**
     * Encodes the specified PublicKey message. Does not implicitly {@link PublicKey.verify|verify} messages.
     * @function encode
     * @memberof PublicKey
     * @static
     * @param {IPublicKey} message PublicKey message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PublicKey.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.Type);
        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.Data);
        return writer;
    };

    /**
     * Encodes the specified PublicKey message, length delimited. Does not implicitly {@link PublicKey.verify|verify} messages.
     * @function encodeDelimited
     * @memberof PublicKey
     * @static
     * @param {IPublicKey} message PublicKey message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PublicKey.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a PublicKey message from the specified reader or buffer.
     * @function decode
     * @memberof PublicKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {PublicKey} PublicKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PublicKey.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.PublicKey();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.Type = reader.int32();
                break;
            case 2:
                message.Data = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("Type"))
            throw $util.ProtocolError("missing required 'Type'", { instance: message });
        if (!message.hasOwnProperty("Data"))
            throw $util.ProtocolError("missing required 'Data'", { instance: message });
        return message;
    };

    /**
     * Decodes a PublicKey message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof PublicKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {PublicKey} PublicKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PublicKey.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a PublicKey message.
     * @function verify
     * @memberof PublicKey
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    PublicKey.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        switch (message.Type) {
        default:
            return "Type: enum value expected";
        case 0:
        case 1:
        case 2:
            break;
        }
        if (!(message.Data && typeof message.Data.length === "number" || $util.isString(message.Data)))
            return "Data: buffer expected";
        return null;
    };

    /**
     * Creates a PublicKey message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PublicKey
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {PublicKey} PublicKey
     */
    PublicKey.fromObject = function fromObject(object) {
        if (object instanceof $root.PublicKey)
            return object;
        var message = new $root.PublicKey();
        switch (object.Type) {
        case "RSA":
        case 0:
            message.Type = 0;
            break;
        case "Ed25519":
        case 1:
            message.Type = 1;
            break;
        case "Secp256k1":
        case 2:
            message.Type = 2;
            break;
        }
        if (object.Data != null)
            if (typeof object.Data === "string")
                $util.base64.decode(object.Data, message.Data = $util.newBuffer($util.base64.length(object.Data)), 0);
            else if (object.Data.length)
                message.Data = object.Data;
        return message;
    };

    /**
     * Creates a plain object from a PublicKey message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PublicKey
     * @static
     * @param {PublicKey} message PublicKey
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PublicKey.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.Type = options.enums === String ? "RSA" : 0;
            object.Data = options.bytes === String ? "" : [];
        }
        if (message.Type != null && message.hasOwnProperty("Type"))
            object.Type = options.enums === String ? $root.KeyType[message.Type] : message.Type;
        if (message.Data != null && message.hasOwnProperty("Data"))
            object.Data = options.bytes === String ? $util.base64.encode(message.Data, 0, message.Data.length) : options.bytes === Array ? Array.prototype.slice.call(message.Data) : message.Data;
        return object;
    };

    /**
     * Converts this PublicKey to JSON.
     * @function toJSON
     * @memberof PublicKey
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PublicKey.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PublicKey;
})();

$root.PrivateKey = (function() {

    /**
     * Properties of a PrivateKey.
     * @exports IPrivateKey
     * @interface IPrivateKey
     * @property {KeyType} Type PrivateKey Type
     * @property {Uint8Array} Data PrivateKey Data
     */

    /**
     * Constructs a new PrivateKey.
     * @exports PrivateKey
     * @classdesc Represents a PrivateKey.
     * @constructor
     * @param {IPrivateKey=} [properties] Properties to set
     */
    function PrivateKey(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * PrivateKey Type.
     * @member {KeyType}Type
     * @memberof PrivateKey
     * @instance
     */
    PrivateKey.prototype.Type = 0;

    /**
     * PrivateKey Data.
     * @member {Uint8Array}Data
     * @memberof PrivateKey
     * @instance
     */
    PrivateKey.prototype.Data = $util.newBuffer([]);

    /**
     * Creates a new PrivateKey instance using the specified properties.
     * @function create
     * @memberof PrivateKey
     * @static
     * @param {IPrivateKey=} [properties] Properties to set
     * @returns {PrivateKey} PrivateKey instance
     */
    PrivateKey.create = function create(properties) {
        return new PrivateKey(properties);
    };

    /**
     * Encodes the specified PrivateKey message. Does not implicitly {@link PrivateKey.verify|verify} messages.
     * @function encode
     * @memberof PrivateKey
     * @static
     * @param {IPrivateKey} message PrivateKey message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PrivateKey.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.Type);
        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.Data);
        return writer;
    };

    /**
     * Encodes the specified PrivateKey message, length delimited. Does not implicitly {@link PrivateKey.verify|verify} messages.
     * @function encodeDelimited
     * @memberof PrivateKey
     * @static
     * @param {IPrivateKey} message PrivateKey message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PrivateKey.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a PrivateKey message from the specified reader or buffer.
     * @function decode
     * @memberof PrivateKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {PrivateKey} PrivateKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PrivateKey.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.PrivateKey();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.Type = reader.int32();
                break;
            case 2:
                message.Data = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("Type"))
            throw $util.ProtocolError("missing required 'Type'", { instance: message });
        if (!message.hasOwnProperty("Data"))
            throw $util.ProtocolError("missing required 'Data'", { instance: message });
        return message;
    };

    /**
     * Decodes a PrivateKey message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof PrivateKey
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {PrivateKey} PrivateKey
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PrivateKey.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a PrivateKey message.
     * @function verify
     * @memberof PrivateKey
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    PrivateKey.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        switch (message.Type) {
        default:
            return "Type: enum value expected";
        case 0:
        case 1:
        case 2:
            break;
        }
        if (!(message.Data && typeof message.Data.length === "number" || $util.isString(message.Data)))
            return "Data: buffer expected";
        return null;
    };

    /**
     * Creates a PrivateKey message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PrivateKey
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {PrivateKey} PrivateKey
     */
    PrivateKey.fromObject = function fromObject(object) {
        if (object instanceof $root.PrivateKey)
            return object;
        var message = new $root.PrivateKey();
        switch (object.Type) {
        case "RSA":
        case 0:
            message.Type = 0;
            break;
        case "Ed25519":
        case 1:
            message.Type = 1;
            break;
        case "Secp256k1":
        case 2:
            message.Type = 2;
            break;
        }
        if (object.Data != null)
            if (typeof object.Data === "string")
                $util.base64.decode(object.Data, message.Data = $util.newBuffer($util.base64.length(object.Data)), 0);
            else if (object.Data.length)
                message.Data = object.Data;
        return message;
    };

    /**
     * Creates a plain object from a PrivateKey message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PrivateKey
     * @static
     * @param {PrivateKey} message PrivateKey
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PrivateKey.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.Type = options.enums === String ? "RSA" : 0;
            object.Data = options.bytes === String ? "" : [];
        }
        if (message.Type != null && message.hasOwnProperty("Type"))
            object.Type = options.enums === String ? $root.KeyType[message.Type] : message.Type;
        if (message.Data != null && message.hasOwnProperty("Data"))
            object.Data = options.bytes === String ? $util.base64.encode(message.Data, 0, message.Data.length) : options.bytes === Array ? Array.prototype.slice.call(message.Data) : message.Data;
        return object;
    };

    /**
     * Converts this PrivateKey to JSON.
     * @function toJSON
     * @memberof PrivateKey
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PrivateKey.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PrivateKey;
})();

module.exports = $root;
