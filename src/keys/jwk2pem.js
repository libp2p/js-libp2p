'use strict'

const forge = {
  util: require('node-forge/lib/util'),
  pki: require('node-forge/lib/pki'),
  jsbn: require('node-forge/lib/jsbn')
}

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

function jwk2privPem (key) {
  return forge.pki.privateKeyToPem(jwk2priv(key))
}

function jwk2pub (key) {
  return forge.pki.setRsaPublicKey(...convert(key, ['n', 'e']))
}

function jwk2pubPem (key) {
  return forge.pki.publicKeyToPem(jwk2pub(key))
}

module.exports = {
  jwk2pub,
  jwk2pubPem,
  jwk2priv,
  jwk2privPem
}
