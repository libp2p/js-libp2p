'use strict'

// @ts-ignore protons do not export types
const protobuf = require('protons')

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
