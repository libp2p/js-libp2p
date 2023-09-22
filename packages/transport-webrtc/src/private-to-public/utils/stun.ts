import ip from 'ip'

// Packet header length
export const HEADER_LENGTH = 20;
// STUN magic cookie
export const MAGIC_COOKIE = 0x2112A442;
// Max transaction ID (32bit)
export const TID_MAX = Math.pow(2,32);

// Binding Class
export const BINDING_CLASS  = 0x0001;
// STUN Method Mask
export const METHOD_MASK = 0x0110;
// STUN Method
export const METHOD = {
    REQUEST:    0x0000,
    INDICATION: 0x0010,
    RESPONSE_S: 0x0100,
    RESPONSE_E: 0x0110
};

// Attributes
export const ATTR = {
    MAPPED_ADDRESS:     0x0001,
    USERNAME:           0x0006,
    MESSAGE_INTEGRITY:  0x0008,
    ERROR_CODE:         0x0009,
    UNKNOWN_ATTRIBUTES: 0x000A,
    REALM:              0x0014,
    NONCE:              0x0015,
    XOR_MAPPED_ADDRESS: 0x0020,
    SOFTWARE:           0x8022,
    ALTERNATE_SERVER:   0x8023,
    FINGERPRINT:        0x8028
};

// Error code
export const ERROR_CODE = {
    300: 'Try Alternate',
    400: 'Bad Request',
    401: 'Unauthorized',
    420: 'Unknown Attribute',
    438: 'Stale Nonce',
    500: 'Server Error'
};

interface StunHeader {
  method: number
  length: number
  magic_cookie:  number,
  tid: number
}

interface AddressInfo {
  address: string
  family: 4 | 6
  port: number
}

// Packet Class
export class StunPacket {
  class: number
  method: number
  attrs: Record<string, string>
  tid: number

  constructor (stun_class: number, method: number, attrs: Record<string, string>) {
    this.class  = stun_class;
    this.method = method;
    this.attrs  = attrs || {};
    this.tid    = this._getTransactionId()
  }

  /**
   * Generate tansaction ID
   */
  private _getTransactionId() {
      return (Math.random() * TID_MAX)
  }

 /**
  * Encode packet
  */
  encode () {
    var encoded_attrs = this._encodeAttributes();
    var encoded_header = this._encodeHeader(encoded_attrs.length);

    return Buffer.concat([encoded_header, encoded_attrs]);
  }

  /**
   * Encode packet header
   */
  private _encodeHeader (length: number ) {
    var type = this.method | this.class;
    var encoded_header = new Buffer(HEADER_LENGTH);

    encoded_header.writeUInt16BE((type & 0x3fff), 0);
    encoded_header.writeUInt16BE(length, 2);
    encoded_header.writeUInt32BE(MAGIC_COOKIE, 4);
    encoded_header.writeUInt32BE(0, 8);
    encoded_header.writeUInt32BE(0, 12);
    encoded_header.writeUInt32BE(this.tid, 16);

    return encoded_header;
  }

  /**
   * Encode packet attributes
   */
  private _encodeAttributes () {
    var encoded_attrs = new Buffer(0);

    // TODO: Not implemented yet

    return encoded_attrs;
  }

  /**
   * Determines whether STUN Packet
   */

}

export function isStunPacket(buffer: Buffer): boolean {
  var block = buffer.readUInt8(0);
  var bit1 = block & 0x80;
  var bit2 = block & 0x40;

  return (bit1 === 0 && bit2 === 0) ? true : false;
}

/**
 * Decode packet
 */
export function decode(buffer: Buffer) {
  if (isStunPacket(buffer) === false) {
      return null;
  }

  var buffer_header = buffer.slice(0, HEADER_LENGTH);
  var header = decodeHeader(buffer_header);

  var buffer_attrs = buffer.slice(HEADER_LENGTH, buffer.length);
  var attrs = decodeAttributes(buffer_attrs, buffer_header);

  var packet = new StunPacket(BINDING_CLASS, header.method, attrs);
  packet.tid = header.tid;

  return packet;
}

/**
 * Decode packet header
 */
function decodeHeader(buffer: Buffer): StunHeader {
  return {
    method: buffer.readUInt16BE(0) & METHOD_MASK,
    length: buffer.readUInt16BE(2),
    magic_cookie: buffer.readUInt32BE(4),
    tid: buffer.readUInt32BE(16)
  }
}

/**
 * Decode packet attributes
 */
function decodeAttributes(buffer: Buffer, buffer_header: Buffer) {
  var attrs: Record<number, string> = {};
  var offset = 0;

  while (offset < buffer.length) {
    var type = buffer.readUInt16BE(offset);
    offset += 2;

    var length = buffer.readUInt16BE(offset);
    var block_out = length % 4;
    if (block_out > 0) {
        length += 4 - block_out;
    }
    offset += 2;

    var value: any = buffer.slice(offset, offset + length);
    offset += length;

    switch (type) {
    case ATTR.MAPPED_ADDRESS:
        value = decodeMappedAddress(value);
        break;
    case ATTR.XOR_MAPPED_ADDRESS:
        value = decodeXorMappedAddress(value, buffer_header);
        break;
    case ATTR.ERROR_CODE:
        value = decodeErrorCode(value);
        break;
    case ATTR.UNKNOWN_ATTRIBUTES:
        value = decodeUnknownAttributes(value);
        break;
    }

    attrs[type] = value;
  }

  return attrs;
};

/**
 * Decode MAPPED-ADDRESS value
 */
function decodeMappedAddress(buffer: Buffer): AddressInfo {
  var family: 4 | 6 = (buffer.readUInt16BE(0) === 0x02) ? 6 : 4;

  return {
      family:  family,
      port:    buffer.readUInt16BE(2),
      address: ip.toString(buffer, 4, family)
  };
}

/**
 * Decode XOR-MAPPED-ADDRESS value
 * See https://tools.ietf.org/html/rfc5389#section-15.2
 */
function decodeXorMappedAddress(buffer: Buffer, buffer_header: Buffer) {
    var family = (buffer.readUInt16BE(0) === 0x02) ? 6 : 4;

    var magic = buffer_header.slice(4, 8);  // BE
    var tid = buffer_header.slice(8, 20); // BE

    var xport = buffer.slice(2, 4);                     // LE
    var xaddr = buffer.slice(4, family === 4 ? 8 : 20); // LE

    var port = xor(xport, magic.slice(0, 2));
    var addr = xor(xaddr, family === 4 ? magic : Buffer.concat([magic, tid]))

    return {
        family:  family,
        port:    port.readUInt16BE(0),
        address: ip.toString(addr, 0, family)
    };
}

//// Decode XOR-MAPPED-ADDRESS value
//Packet._decodeXorMappedAddress = function _decodeMappedAddress(buffer, buffer_header) {
//    var family = (buffer.readUInt16BE(0) === 0x02) ? 6 : 4;
//
//    var xport = buffer.slice(2, 4);
//    var xaddr = buffer.slice(4);
//
//    var xorAddrBuf = buffer.slice(4, family === 4 ? 8 : 20);
//
//    var port = this._xor(xport, new Buffer(Packet.MAGIC_COOKIE).slice(0, 2));
//    var addr;
//    if (family === 4) {
//      addr = this._xor(xaddr, new Buffer(Packet.MAGIC_COOKIE));
//    } else {
//      var magic_buffer = new Buffer(Packet.MAGIC_COOKIE);
//      var tid_buffer = new Buffer([tid]);
//      addr = this._xor(xaddr, Buffer.concat([magic_buffer, tid_buffer]));
//    }
//
//    return {
//        family:  family,
//        port:    port,
//        address: addr
//    };
//};

/**
 * Decode ERROR-CODE value
 */
function decodeErrorCode(buffer: Buffer) {
    var block = buffer.readUInt32BE(0);
    var code = (block & 0x700) * 100 + block & 0xff;
    var reason = buffer.readUInt32BE(4);

    return {
        code: code,
        reason: reason
    };
};

/**
 * Decode UNKNOWN-ATTRIBUTES value
 */
function decodeUnknownAttributes(buffer: Buffer) {
    var unknown_attrs = [];
    var offset = 0;

    while (offset < buffer.length) {
        unknown_attrs.push(buffer.readUInt16BE(offset));
        offset += 2;
    }

    return unknown_attrs;
};

function xor(a: Buffer, b: Buffer): Buffer {
    var data = [];

    if (b.length > a.length) {
      var tmp = a;
      a = b;
      b = tmp;
    }

    for (var i=0, len=a.length; i<len; i++) {
      data.push(a[i] ^ b[i]);
    }

    return new Buffer(data);
};
