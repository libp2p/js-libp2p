'use strict'

require('node-forge/lib/rsa')
require('node-forge/lib/util')
require('node-forge/lib/jsbn')
const forge = require('node-forge/lib/forge')

function base64urlToBigInteger (str) {
  var bytes = forge.util.decode64(
    (str + '==='.slice((str.length + 3) % 4))
      .replace(/-/g, '+')
      .replace(/_/g, '/'))
  return new forge.jsbn.BigInteger(forge.util.bytesToHex(bytes), 16)
}

function convert (key, types) {
  return types.map(t => base64urlToBigInteger(key[t]))
}

function jwk2priv (key) {
  return forge.pki.setRsaPrivateKey(...convert(key, ['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi']))
}

function jwk2pub (key) {
  return forge.pki.setRsaPublicKey(...convert(key, ['n', 'e']))
}

module.exports = {
  jwk2pub,
  jwk2priv
}
