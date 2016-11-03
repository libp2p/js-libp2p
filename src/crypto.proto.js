'use strict'

module.exports = `enum KeyType {
  RSA = 0;
}

message PublicKey {
  required KeyType Type = 1;
  required bytes Data = 2;
}

message PrivateKey {
  required KeyType Type = 1;
  required bytes Data = 2;
}`
