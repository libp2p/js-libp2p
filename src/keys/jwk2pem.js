'use strict'

require('node-forge/lib/rsa')
const forge = require('node-forge/lib/forge')
const { base64urlToBigInteger } = require('../util')

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
