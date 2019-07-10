/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const libp2pCrypto = require('libp2p-crypto')
const keysPBM = libp2pCrypto.keys.keysPBM
const randomBytes = libp2pCrypto.randomBytes
const crypto = require('../src/crypto')(randomBytes)

describe('secp256k1 keys', () => {
  let key
  const secp256k1 = require('../src')(keysPBM, randomBytes)

  before(async () => {
    key = await secp256k1.generateKeyPair()
  })

  it('generates a valid key', async () => {
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
    expect(key.public).to.be.an.instanceof(secp256k1.Secp256k1PublicKey)

    const digest = await key.hash()
    expect(digest).to.have.length(34)

    const publicDigest = await key.public.hash()
    expect(publicDigest).to.have.length(34)
  })

  it('optionally accepts a `bits` argument when generating a key', async () => {
    const _key = await secp256k1.generateKeyPair(256)
    expect(_key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.public.verify(text, sig)
    expect(res).to.equal(true)
  })

  it('encoding', async () => {
    const keyMarshal = key.marshal()
    const key2 = await secp256k1.unmarshalSecp256k1PrivateKey(keyMarshal)
    const keyMarshal2 = key2.marshal()

    expect(keyMarshal).to.eql(keyMarshal2)

    const pk = key.public
    const pkMarshal = pk.marshal()
    const pk2 = secp256k1.unmarshalSecp256k1PublicKey(pkMarshal)
    const pkMarshal2 = pk2.marshal()

    expect(pkMarshal).to.eql(pkMarshal2)
  })

  it('key id', async () => {
    const id = await key.id()
    expect(id).to.exist()
    expect(id).to.be.a('string')
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.eql(true)

      expect(key.public.equals(key.public)).to.eql(true)
    })

    it('not equals other key', async () => {
      const key2 = await secp256k1.generateKeyPair(256)
      expect(key.equals(key2)).to.eql(false)
      expect(key2.equals(key)).to.eql(false)
      expect(key.public.equals(key2.public)).to.eql(false)
      expect(key2.public.equals(key.public)).to.eql(false)
    })
  })

  it('sign and verify', async () => {
    const data = Buffer.from('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(data, sig)
    expect(valid).to.eql(true)
  })

  it('fails to verify for different data', async () => {
    const data = Buffer.from('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(Buffer.from('hello'), sig)
    expect(valid).to.eql(false)
  })
})

describe('key generation error', () => {
  let generateKey
  let secp256k1

  before(() => {
    generateKey = crypto.generateKey
    crypto.generateKey = () => { throw new Error('Error generating key') }
    secp256k1 = require('../src')(keysPBM, randomBytes, crypto)
  })

  after(() => {
    crypto.generateKey = generateKey
  })

  it('returns an error if key generation fails', async () => {
    try {
      await secp256k1.generateKeyPair()
    } catch (err) {
      return expect(err.message).to.equal('Error generating key')
    }
    throw new Error('Expected error to be thrown')
  })
})

describe('handles generation of invalid key', () => {
  let generateKey
  let secp256k1

  before(() => {
    generateKey = crypto.generateKey
    crypto.generateKey = () => Buffer.from('not a real key')
    secp256k1 = require('../src')(keysPBM, randomBytes, crypto)
  })

  after(() => {
    crypto.generateKey = generateKey
  })

  it('returns an error if key generator returns an invalid key', async () => {
    try {
      await secp256k1.generateKeyPair()
    } catch (err) {
      return expect(err.message).to.equal('Invalid private key')
    }
    throw new Error('Expected error to be thrown')
  })
})

describe('crypto functions', () => {
  let privKey
  let pubKey

  before(async () => {
    privKey = await crypto.generateKey()
    pubKey = crypto.computePublicKey(privKey)
  })

  it('generates valid keys', () => {
    expect(() => {
      crypto.validatePrivateKey(privKey)
      crypto.validatePublicKey(pubKey)
    }).to.not.throw()
  })

  it('does not validate an invalid key', () => {
    expect(() => crypto.validatePublicKey(Buffer.from('42'))).to.throw()
    expect(() => crypto.validatePrivateKey(Buffer.from('42'))).to.throw()
  })

  it('validates a correct signature', async () => {
    const sig = await crypto.hashAndSign(privKey, Buffer.from('hello'))
    const valid = await crypto.hashAndVerify(pubKey, sig, Buffer.from('hello'))
    expect(valid).to.equal(true)
  })

  it('errors if given a null buffer to sign', async () => {
    try {
      await crypto.hashAndSign(privKey, null)
    } catch (err) {
      return // expected
    }
    throw new Error('Expected error to be thrown')
  })

  it('errors when signing with an invalid key', async () => {
    try {
      await crypto.hashAndSign(Buffer.from('42'), Buffer.from('Hello'))
    } catch (err) {
      return expect(err.message).to.equal('private key length is invalid')
    }
    throw new Error('Expected error to be thrown')
  })

  it('errors if given a null buffer to validate', async () => {
    const sig = await crypto.hashAndSign(privKey, Buffer.from('hello'))

    try {
      await crypto.hashAndVerify(privKey, sig, null)
    } catch (err) {
      return // expected
    }
    throw new Error('Expected error to be thrown')
  })

  it('errors when validating a message with an invalid signature', async () => {
    try {
      await crypto.hashAndVerify(pubKey, Buffer.from('invalid-sig'), Buffer.from('hello'))
    } catch (err) {
      return expect(err.message).to.equal('couldn\'t parse DER signature')
    }
    throw new Error('Expected error to be thrown')
  })

  it('errors when signing with an invalid key', async () => {
    try {
      await crypto.hashAndSign(Buffer.from('42'), Buffer.from('Hello'))
    } catch (err) {
      return expect(err.message).to.equal('private key length is invalid')
    }
    throw new Error('Expected error to be thrown')
  })

  it('throws when compressing an invalid public key', () => {
    expect(() => crypto.compressPublicKey(Buffer.from('42'))).to.throw()
  })

  it('throws when decompressing an invalid public key', () => {
    expect(() => crypto.decompressPublicKey(Buffer.from('42'))).to.throw()
  })

  it('compresses/decompresses a valid public key', () => {
    const decompressed = crypto.decompressPublicKey(pubKey)
    expect(decompressed).to.exist()
    expect(decompressed.length).to.be.eql(65)
    const recompressed = crypto.compressPublicKey(decompressed)
    expect(recompressed).to.eql(pubKey)
  })
})

describe('go interop', () => {
  const secp256k1 = require('../src')(keysPBM, randomBytes)
  const fixtures = require('./fixtures/go-interop')

  it('loads a private key marshaled by go-libp2p-crypto', async () => {
    // we need to first extract the key data from the protobuf, which is
    // normally handled by js-libp2p-crypto
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    const key = await secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data)
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
    expect(key.bytes).to.eql(fixtures.privateKey)
  })

  it('loads a public key marshaled by go-libp2p-crypto', () => {
    const decoded = keysPBM.PublicKey.decode(fixtures.publicKey)
    expect(decoded.Type).to.be.eql(keysPBM.KeyType.Secp256k1)

    const key = secp256k1.unmarshalSecp256k1PublicKey(decoded.Data)
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PublicKey)
    expect(key.bytes).to.eql(fixtures.publicKey)
  })

  it('generates the same signature as go-libp2p-crypto', async () => {
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    const key = await secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data)
    const sig = await key.sign(fixtures.message)
    expect(sig).to.eql(fixtures.signature)
  })
})
