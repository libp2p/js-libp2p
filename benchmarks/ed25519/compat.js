/* eslint-disable no-console */
'use strict'

/*
 * Make sure that every Ed25519 implementation can use keys generated
 * by every other implementation to sign and verify messages signed
 * by themselves and by every other implementation using those keys.
 *
 * Nb. some modules return different structures from their key generation
 * routine - we normalise to `{ privateKey: seed, publicKey }`.
 *
 * Most implementations return the seed as the private key but supercop.wasm
 * returns a hash of the seed.  We ignore supercop's private key in favour
 * of the seed here, since we can re-create it using the createKeyPair
 * function because key generation is deterministic for a given seed.
 */

const randomBytes = require('iso-random-stream/src/random')
const { concat } = require('uint8arrays/concat')
const { fromString } = require('uint8arrays/from-string')

const native = require('ed25519')
const noble = require('@noble/ed25519')
const { subtle } = require('crypto').webcrypto
require('node-forge/lib/ed25519')
const forge = require('node-forge/lib/forge')
const stable = require('@stablelib/ed25519')
const supercopWasm = require('supercop.wasm')

const ALGORITHM = 'NODE-ED25519'
const ED25519_PKCS8_PREFIX = fromString('302e020100300506032b657004220420', 'hex')

const implementations = [{
  name: '@noble/ed25519',
  before: () => {},
  generateKeyPair: async () => {
    const privateKey = noble.utils.randomPrivateKey()
    const publicKey = await noble.getPublicKey(privateKey)

    return {
      privateKey,
      publicKey
    }
  },
  sign: (message, keyPair) => noble.sign(message, keyPair.privateKey),
  verify: (message, signature, keyPair) => noble.verify(signature, message, keyPair.publicKey)
}, {
  name: '@stablelib/ed25519',
  before: () => {},
  generateKeyPair: async () => {
    const key = stable.generateKeyPair()

    return {
      privateKey: key.secretKey.subarray(0, 32),
      publicKey: key.publicKey
    }
  },
  sign: (message, keyPair) => stable.sign(concat([keyPair.privateKey, keyPair.publicKey]), message),
  verify: (message, signature, keyPair) => stable.verify(keyPair.publicKey, message, signature)
}, {
  name: 'node-forge/ed25519',
  before: () => {},
  generateKeyPair: async () => {
    const seed = randomBytes(32)
    const key = await forge.pki.ed25519.generateKeyPair({ seed })

    return {
      privateKey: key.privateKey.subarray(0, 32),
      publicKey: key.publicKey
    }
  },
  sign: (message, keyPair) => forge.pki.ed25519.sign({ message, privateKey: keyPair.privateKey }),
  verify: (message, signature, keyPair) => forge.pki.ed25519.verify({ signature, message, publicKey: keyPair.publicKey })
}, {
  name: 'supercop.wasm',
  before: () => {
    return new Promise(resolve => {
      supercopWasm.ready(() => {
        resolve()
      })
    })
  },
  generateKeyPair: async () => {
    const seed = supercopWasm.createSeed()
    const key = supercopWasm.createKeyPair(seed)

    return {
      privateKey: seed,
      publicKey: key.publicKey
    }
  },
  sign: (message, keyPair) => {
    const key = supercopWasm.createKeyPair(keyPair.privateKey)

    return supercopWasm.sign(message, key.publicKey, key.secretKey)
  },
  verify: (message, signature, keyPair) => {
    return supercopWasm.verify(signature, message, keyPair.publicKey)
  }
}, {
  name: 'native Ed25519',
  generateKeyPair: async () => {
    const seed = randomBytes(32)
    const key = native.MakeKeypair(seed)

    return {
      privateKey: key.privateKey.subarray(0, 32),
      publicKey: key.publicKey
    }
  },
  sign: (message, keyPair) => native.Sign(message, keyPair.privateKey),
  verify: (message, signature, keyPair) => native.Verify(message, signature, keyPair.publicKey)
}, {
  name: 'node.js web crypto',
  generateKeyPair: async () => {
    const key = await subtle.generateKey({
      name: 'NODE-ED25519',
      namedCurve: 'NODE-ED25519'
    }, true, ['sign', 'verify'])
    const jwk = await subtle.exportKey('jwk', key.privateKey)

    return {
      privateKey: fromString(jwk.d, 'base64url'),
      publicKey: fromString(jwk.x, 'base64url')
    }
  },
  sign: async (message, keyPair) => {
    const pkcs8 = concat([
      ED25519_PKCS8_PREFIX,
      keyPair.privateKey
    ], ED25519_PKCS8_PREFIX.length + 32)
    const cryptoKey = await subtle.importKey('pkcs8', pkcs8, {
      name: ALGORITHM,
      namedCurve: ALGORITHM
    }, true, ['sign'])

    const signature = await subtle.sign(ALGORITHM, cryptoKey, message)

    return new Uint8Array(signature)
  },
  verify: async (message, signature, keyPair) => {
    const cryptoKey = await subtle.importKey('raw', keyPair.publicKey, {
      name: ALGORITHM,
      namedCurve: ALGORITHM,
      public: true
    }, true, ['verify'])

    return subtle.verify(ALGORITHM, cryptoKey, signature, message)
  }
}]

async function test (a, b) {
  console.info(`test ${a.name} against ${b.name}`)
  const message = Buffer.from('hello world ' + Math.random())

  const keyPair = await a.generateKeyPair()

  if (keyPair.privateKey.length !== 32) {
    throw new Error('Private key not 32 bytes')
  }

  if (keyPair.publicKey.length !== 32) {
    throw new Error('Public key not 32 bytes')
  }

  // make sure we can sign and verify with keys created by the other implementation
  const pairs = [[a, a], [a, b], [b, a], [b, b]]

  for (const [a, b] of pairs) {
    console.info('test', a.name, 'against', b.name)
    const signature = await a.sign(message, keyPair)
    const isSigned = await b.verify(message, signature, keyPair)

    if (!isSigned) {
      console.error(`${b.name} could not verify signature created by ${a.name}`)
    }
  }
}

async function main () {
  for (const a of implementations) {
    if (a.before) {
      await a.before()
    }

    for (const b of implementations) {
      if (b.before) {
        await b.before()
      }

      await test(a, b)
      await test(b, a)
    }
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
