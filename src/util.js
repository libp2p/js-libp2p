'use strict'

require('node-forge/lib/util')
require('node-forge/lib/jsbn')
const forge = require('node-forge/lib/forge')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayToString = require('uint8arrays/to-string')
const uint8ArrayConcat = require('uint8arrays/concat')

exports.bigIntegerToUintBase64url = (num, len) => {
  // Call `.abs()` to convert to unsigned
  let buf = Uint8Array.from(num.abs().toByteArray()) // toByteArray converts to big endian

  // toByteArray() gives us back a signed array, which will include a leading 0
  // byte if the most significant bit of the number is 1:
  // https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-integer
  // Our number will always be positive so we should remove the leading padding.
  buf = buf[0] === 0 ? buf.slice(1) : buf

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return uint8ArrayToString(buf, 'base64url')
}

// Convert a base64url encoded string to a BigInteger
exports.base64urlToBigInteger = str => {
  const buf = exports.base64urlToBuffer(str)
  return new forge.jsbn.BigInteger(uint8ArrayToString(buf, 'base16'), 16)
}

exports.base64urlToBuffer = (str, len) => {
  let buf = uint8ArrayFromString(str, 'base64urlpad')

  if (len != null) {
    if (buf.length > len) throw new Error('byte array longer than desired length')
    buf = uint8ArrayConcat([new Uint8Array(len - buf.length), buf])
  }

  return buf
}
