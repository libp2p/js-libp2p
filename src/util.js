'use strict'

const { Buffer } = require('buffer')
require('node-forge/lib/util')
require('node-forge/lib/jsbn')
const forge = require('node-forge/lib/forge')

exports.bigIntegerToUintBase64url = (num, len) => {
  // Call `.abs()` to convert to unsigned
  let buf = Buffer.from(num.abs().toByteArray()) // toByteArray converts to big endian

  // toByteArray() gives us back a signed array, which will include a leading 0
  // byte if the most significant bit of the number is 1:
  // https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-integer
  // Our number will always be positive so we should remove the leading padding.
  buf = buf[0] === 0 ? buf.slice(1) : buf

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = Buffer.concat([Buffer.alloc(len - buf.length), buf])
  }

  return exports.bufferToBase64url(buf)
}

// Convert a Buffer to a base64 encoded string without padding
// Adapted from https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#appendix-C
exports.bufferToBase64url = buf => {
  return buf
    .toString('base64')
    .split('=')[0] // Remove any trailing '='s
    .replace(/\+/g, '-') // 62nd char of encoding
    .replace(/\//g, '_') // 63rd char of encoding
}

// Convert a base64url encoded string to a BigInteger
exports.base64urlToBigInteger = str => {
  const buf = exports.base64urlToBuffer(str)
  return new forge.jsbn.BigInteger(buf.toString('hex'), 16)
}

exports.base64urlToBuffer = (str, len) => {
  str = (str + '==='.slice((str.length + 3) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  let buf = Buffer.from(str, 'base64')

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = Buffer.concat([Buffer.alloc(len - buf.length), buf])
  }

  return buf
}
