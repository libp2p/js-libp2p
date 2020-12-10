'use strict'

const protobuf = require('protons')

/**
 * @typedef {Object} Proto
 * @property {import('../types').ExchangeProto} Exchange,
 * @property {typeof import('../types').KeyType} KeyType
 * @property {import('../types').PublicKeyProto} PublicKey
 */

/**
 * @type {Proto}
 */
module.exports = protobuf(`
message Exchange {
  optional bytes id = 1;
  optional PublicKey pubkey = 2;
}

enum KeyType {
  RSA = 0;
  Ed25519 = 1;
  Secp256k1 = 2;
  ECDSA = 3;
}

message PublicKey {
  required KeyType Type = 1;
  required bytes Data = 2;
}
`)
