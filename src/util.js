'use strict'

const BN = require('asn1.js').bignum

// Convert a BN.js instance to a base64 encoded string without padding
// Adapted from https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#appendix-C
exports.toBase64 = function toBase64 (bn, len) {
  // if len is defined then the bytes are leading-0 padded to the length
  let s = bn.toArrayLike(Buffer, 'be', len).toString('base64')

  return s
    .replace(/(=*)$/, '') // Remove any trailing '='s
    .replace(/\+/g, '-') // 62nd char of encoding
    .replace(/\//g, '_') // 63rd char of encoding
}

// Convert a base64 encoded string to a BN.js instance
exports.toBn = function toBn (str) {
  return new BN(Buffer.from(str, 'base64'))
}
