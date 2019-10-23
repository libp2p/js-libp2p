'use strict'

const webcrypto = require('../webcrypto')
const randomBytes = require('../random-bytes')

exports.utils = require('./rsa-utils')

exports.generateKey = async function (bits) {
  const pair = await webcrypto.get().subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: 'SHA-256' }
    },
    true,
    ['sign', 'verify']
  )

  const keys = await exportKey(pair)

  return {
    privateKey: keys[0],
    publicKey: keys[1]
  }
}

// Takes a jwk key
exports.unmarshalPrivateKey = async function (key) {
  const privateKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    true,
    ['sign']
  )

  const pair = [
    privateKey,
    await derivePublicFromPrivate(key)
  ]

  const keys = await exportKey({
    privateKey: pair[0],
    publicKey: pair[1]
  })

  return {
    privateKey: keys[0],
    publicKey: keys[1]
  }
}

exports.getRandomValues = randomBytes

exports.hashAndSign = async function (key, msg) {
  const privateKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  )

  const sig = await webcrypto.get().subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    Uint8Array.from(msg)
  )

  return Buffer.from(sig)
}

exports.hashAndVerify = async function (key, sig, msg) {
  const publicKey = await webcrypto.get().subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['verify']
  )

  return webcrypto.get().subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    sig,
    msg
  )
}

function exportKey (pair) {
  return Promise.all([
    webcrypto.get().subtle.exportKey('jwk', pair.privateKey),
    webcrypto.get().subtle.exportKey('jwk', pair.publicKey)
  ])
}

function derivePublicFromPrivate (jwKey) {
  return webcrypto.get().subtle.importKey(
    'jwk',
    {
      kty: jwKey.kty,
      n: jwKey.n,
      e: jwKey.e
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    true,
    ['verify']
  )
}

// bloody dark magic. webcrypto's why.

/*

Explanation:
  - Convert JWK to PEM
  - Load PEM with nodeForge
  - Convert msg buffer to nodeForge buffer
  - Convert resulting nodeForge buffer to buffer

*/

const forge = require('node-forge')
const pki = forge.pki
const jwkToPem = require('pem-jwk').jwk2pem
function convertKey (key, pub, msg, handle) {
  const pem = jwkToPem(key)
  const fkey = pki[pub ? 'publicKeyFromPem' : 'privateKeyFromPem'](pem)
  const fmsg = forge.util.hexToBytes(Buffer.from(msg).toString('hex'))
  const fomsg = handle(fmsg, fkey)
  return Buffer.from(forge.util.bytesToHex(fomsg), 'hex')
}

exports.encrypt = async function (key, msg) {
  return convertKey(key, true, msg, (msg, key) => key.encrypt(msg))

  /* key = Object.assign({}, key)
  key.key_ops = ['encrypt']

  return webcrypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    false,
    ['encrypt']
  ).then((publicKey) => {
    return webcrypto.subtle.encrypt(
      { name: 'RSA-OEAP' },
      publicKey,
      Uint8Array.from(msg)
    )
  }).then((enc) => Buffer.from(enc)) */
}

exports.decrypt = async function (key, msg) {
  return convertKey(key, false, msg, (msg, key) => key.decrypt(msg))

  /* key = Object.assign({}, key)
  key.key_ops = ['decrypt']

  return webcrypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    false,
    ['decrypt']
  ).then((privateKey) => {
    return webcrypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      Uint8Array.from(msg)
    )
  }).then((dec) => Buffer.from(dec)) */
}
