/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as crypto from '../../src/index.js'
import fixtures from '../fixtures/go-key-ed25519.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import { Ed25519PrivateKey } from '../../src/keys/ed25519-class.js'

const ed25519 = crypto.keys.supportedKeys.ed25519

/** @typedef {import("libp2p-crypto").PrivateKey} PrivateKey */

describe('ed25519', function () {
  this.timeout(20 * 1000)
  let key: Ed25519PrivateKey
  before(async () => {
    const generated = await crypto.keys.generateKeyPair('Ed25519', 512)

    if (!(generated instanceof Ed25519PrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    key = generated
  })

  it('generates a valid key', async () => {
    expect(key).to.be.an.instanceof(ed25519.Ed25519PrivateKey)
    const digest = await key.hash()
    expect(digest).to.have.length(34)
  })

  it('generates a valid key from seed', async () => {
    const seed = crypto.randomBytes(32)
    const seededkey = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512)
    expect(seededkey).to.be.an.instanceof(ed25519.Ed25519PrivateKey)
    const digest = await seededkey.hash()
    expect(digest).to.have.length(34)
  })

  it('generates the same key from the same seed', async () => {
    const seed = crypto.randomBytes(32)
    const seededkey1 = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512)
    const seededkey2 = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512)
    expect(seededkey1.equals(seededkey2)).to.eql(true)
    expect(seededkey1.public.equals(seededkey2.public)).to.eql(true)
  })

  it('generates different keys for different seeds', async () => {
    const seed1 = crypto.randomBytes(32)
    const seededkey1 = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed1, 512)
    const seed2 = crypto.randomBytes(32)
    const seededkey2 = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed2, 512)
    expect(seededkey1.equals(seededkey2)).to.eql(false)
    expect(seededkey1.public.equals(seededkey2.public)).to.eql(false)
  })

  it('signs', async () => {
    const text = crypto.randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.public.verify(text, sig)
    expect(res).to.be.eql(true)
  })

  it('encoding', () => {
    const keyMarshal = key.marshal()
    const key2 = ed25519.unmarshalEd25519PrivateKey(keyMarshal)
    const keyMarshal2 = key2.marshal()

    expect(keyMarshal).to.eql(keyMarshal2)

    const pk = key.public
    const pkMarshal = pk.marshal()
    const pk2 = ed25519.unmarshalEd25519PublicKey(pkMarshal)
    const pkMarshal2 = pk2.marshal()

    expect(pkMarshal).to.eql(pkMarshal2)
  })

  it('key id', async () => {
    const key = await crypto.keys.unmarshalPrivateKey(fixtures.verify.privateKey)
    const id = await key.id()
    expect(id).to.eql('12D3KooWLqLxEfJ9nDdEe8Kh8PFvNPQRYDQBwyL7CMM7HhVd5LsX')
  })

  it('should export a password encrypted libp2p-key', async () => {
    const key = await crypto.keys.generateKeyPair('Ed25519')

    if (!(key instanceof Ed25519PrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    const encryptedKey = await key.export('my secret')
    // Import the key
    const importedKey = await crypto.keys.importKey(encryptedKey, 'my secret')

    if (!(importedKey instanceof Ed25519PrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    expect(key.equals(importedKey)).to.equal(true)
  })

  it('should fail to import libp2p-key with wrong password', async () => {
    const key = await crypto.keys.generateKeyPair('Ed25519')
    const encryptedKey = await key.export('my secret', 'libp2p-key')
    try {
      await crypto.keys.importKey(encryptedKey, 'not my secret')
    } catch (err) {
      expect(err).to.exist()
      return
    }
    expect.fail('should have thrown')
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(
        key.equals(key)
      ).to.eql(
        true
      )

      expect(
        key.public.equals(key.public)
      ).to.eql(
        true
      )
    })

    it('not equals other key', async () => {
      const key2 = await crypto.keys.generateKeyPair('Ed25519', 512)

      if (!(key2 instanceof Ed25519PrivateKey)) {
        throw new Error('Key was incorrect type')
      }

      expect(key.equals(key2)).to.eql(false)
      expect(key2.equals(key)).to.eql(false)
      expect(key.public.equals(key2.public)).to.eql(false)
      expect(key2.public.equals(key.public)).to.eql(false)
    })
  })

  it('sign and verify', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(data, sig)
    expect(valid).to.eql(true)
  })

  it('sign and verify from seed', async () => {
    const seed = new Uint8Array(32).fill(1)
    const seededkey = await crypto.keys.generateKeyPairFromSeed('Ed25519', seed)
    const data = uint8ArrayFromString('hello world')
    const sig = await seededkey.sign(data)
    const valid = await seededkey.public.verify(data, sig)
    expect(valid).to.eql(true)
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.eql(false)
  })

  describe('throws error instead of crashing', () => {
    const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2)
    testGarbage('crypto.keys.unmarshalPrivateKey', crypto.keys.unmarshalPrivateKey.bind(crypto.keys))
  })

  describe('go interop', () => {
    // @ts-check
    it('verifies with data from go', async () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.eql(true)
    })

    it('does not include the redundant public key when marshalling privatekey', async () => {
      const key = await crypto.keys.unmarshalPrivateKey(fixtures.redundantPubKey.privateKey)
      const bytes = key.marshal()
      expect(bytes.length).to.equal(64)
      expect(bytes.subarray(32)).to.eql(key.public.marshal())
    })

    it('verifies with data from go with redundant public key', async () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.redundantPubKey.publicKey)
      const ok = await key.verify(fixtures.redundantPubKey.data, fixtures.redundantPubKey.signature)
      expect(ok).to.eql(true)
    })

    it('generates the same signature as go', async () => {
      const key = await crypto.keys.unmarshalPrivateKey(fixtures.verify.privateKey)
      const sig = await key.sign(fixtures.verify.data)
      expect(sig).to.eql(fixtures.verify.signature)
    })

    it('generates the same signature as go with redundant public key', async () => {
      const key = await crypto.keys.unmarshalPrivateKey(fixtures.redundantPubKey.privateKey)
      const sig = await key.sign(fixtures.redundantPubKey.data)
      expect(sig).to.eql(fixtures.redundantPubKey.signature)
    })
  })
})
