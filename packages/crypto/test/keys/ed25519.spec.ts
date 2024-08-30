/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { randomBytes } from '../../src/index.js'
import { unmarshalEd25519PrivateKey, unmarshalEd25519PublicKey } from '../../src/keys/ed25519-utils.js'
import { generateKeyPair, generateKeyPairFromSeed, exportPrivateKey, importPrivateKey, privateKeyFromProtobuf, publicKeyFromProtobuf } from '../../src/keys/index.js'
import fixtures from '../fixtures/go-key-ed25519.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import type { Ed25519PrivateKey } from '@libp2p/interface'

describe('ed25519', function () {
  this.timeout(20 * 1000)
  let key: Ed25519PrivateKey

  before(async () => {
    key = await generateKeyPair('Ed25519')

    if (key.type !== 'Ed25519') {
      throw new Error('Key was incorrect type')
    }
  })

  it('generates a valid key', async () => {
    expect(key).to.have.property('type', 'Ed25519')
    expect(key.equals(key)).to.be.true()
    expect(key.raw).to.have.length(64)
    expect(key.publicKey.raw).to.have.length(32)
  })

  it('generates a valid key from seed', async () => {
    const seed = randomBytes(32)
    const seededkey = await generateKeyPairFromSeed('Ed25519', seed)
    expect(seededkey).to.have.property('type', 'Ed25519')
    expect(key.raw).to.have.length(64)
    expect(key.publicKey.raw).to.have.length(32)
  })

  it('generates the same key from the same seed', async () => {
    const seed = randomBytes(32)
    const seededkey1 = await generateKeyPairFromSeed('Ed25519', seed)
    const seededkey2 = await generateKeyPairFromSeed('Ed25519', seed)
    expect(seededkey1.equals(seededkey2)).to.be.true()
    expect(seededkey1.publicKey.equals(seededkey2.publicKey)).to.be.true()
  })

  it('generates different keys for different seeds', async () => {
    const seed1 = randomBytes(32)
    const seededkey1 = await generateKeyPairFromSeed('Ed25519', seed1)
    const seed2 = randomBytes(32)
    const seededkey2 = await generateKeyPairFromSeed('Ed25519', seed2)
    expect(seededkey1.equals(seededkey2)).to.be.false()
    expect(seededkey1.publicKey.equals(seededkey2.publicKey)).to.be.false()
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = key.publicKey.verify(text, sig)
    expect(res).to.be.be.true()
  })

  it('signs a list', async () => {
    const text = new Uint8ArrayList(
      randomBytes(512),
      randomBytes(512)
    )
    const sig = await key.sign(text)

    expect(key.sign(text.subarray()))
      .to.deep.equal(sig, 'list did not have same signature as a single buffer')

    expect(key.publicKey.verify(text, sig))
      .to.be.true('did not verify message as list')
    expect(key.publicKey.verify(text.subarray(), sig))
      .to.be.true('did not verify message as single buffer')
  })

  it('encoding', () => {
    const keyMarshal = key.raw
    const key2 = unmarshalEd25519PrivateKey(keyMarshal)
    const keyMarshal2 = key2.raw

    expect(keyMarshal).to.equalBytes(keyMarshal2)

    const pk = key.publicKey
    const pkMarshal = pk.raw
    const pk2 = unmarshalEd25519PublicKey(pkMarshal)
    const pkMarshal2 = pk2.raw

    expect(pkMarshal).to.equalBytes(pkMarshal2)
  })

  it('publicKey toString', async () => {
    const key = await privateKeyFromProtobuf(fixtures.verify.privateKey)
    expect(key.publicKey.toString()).to.eql('12D3KooWLqLxEfJ9nDdEe8Kh8PFvNPQRYDQBwyL7CMM7HhVd5LsX')
  })

  it('should export a password encrypted libp2p-key', async () => {
    const key = await generateKeyPair('Ed25519')
    const encryptedKey = await exportPrivateKey(key, 'my secret')

    // Import the key
    const importedKey = await importPrivateKey(encryptedKey, 'my secret')

    expect(key.equals(importedKey)).to.equal(true)
  })

  it('should export a libp2p-key with no password to encrypt', async () => {
    const key = await generateKeyPair('Ed25519')
    const encryptedKey = await exportPrivateKey(key, '')

    // Import the key
    const importedKey = await importPrivateKey(encryptedKey, '')

    expect(key.equals(importedKey)).to.equal(true)
  })

  it('should fail to import libp2p-key with wrong password', async () => {
    const key = await generateKeyPair('Ed25519')
    const encryptedKey = await exportPrivateKey(key, 'my secret', 'libp2p-key')

    try {
      await importPrivateKey(encryptedKey, 'not my secret')
    } catch (err) {
      expect(err).to.exist()
      return
    }

    expect.fail('should have thrown')
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.be.true()

      expect(key.publicKey.equals(key.publicKey)).to.be.true()
    })

    it('not equals other key', async () => {
      const key2 = await generateKeyPair('Ed25519')

      expect(key.equals(key2)).to.be.false()
      expect(key2.equals(key)).to.be.false()
      expect(key.publicKey.equals(key2.publicKey)).to.be.false()
      expect(key2.publicKey.equals(key.publicKey)).to.be.false()
    })
  })

  it('sign and verify', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = key.publicKey.verify(data, sig)
    expect(valid).to.be.true()
  })

  it('sign and verify from seed', async () => {
    const seed = new Uint8Array(32).fill(1)
    const seededkey = await generateKeyPairFromSeed('Ed25519', seed)
    const data = uint8ArrayFromString('hello world')
    const sig = await seededkey.sign(data)
    const valid = await seededkey.publicKey.verify(data, sig)
    expect(valid).to.be.true()
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = key.publicKey.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.be.false()
  })

  describe('throws error instead of crashing', () => {
    const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2)
    testGarbage('unmarshalPrivateKey', privateKeyFromProtobuf)
  })

  describe('go interop', () => {
    // @ts-check
    it('verifies with data from go', async () => {
      const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.be.true()
    })

    it('does not include the redundant public key when marshalling privatekey', async () => {
      const key = await privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
      const bytes = key.raw
      expect(bytes.length).to.equal(64)
      expect(bytes.subarray(32)).to.eql(key.publicKey.raw)
    })

    it('verifies with data from go with redundant public key', async () => {
      const key = publicKeyFromProtobuf(fixtures.redundantPubKey.publicKey)
      const ok = await key.verify(fixtures.redundantPubKey.data, fixtures.redundantPubKey.signature)
      expect(ok).to.be.true()
    })

    it('generates the same signature as go', async () => {
      const key = await privateKeyFromProtobuf(fixtures.verify.privateKey)
      const sig = await key.sign(fixtures.verify.data)
      expect(sig).to.eql(fixtures.verify.signature)
    })

    it('generates the same signature as go with redundant public key', async () => {
      const key = await privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
      const sig = await key.sign(fixtures.redundantPubKey.data)
      expect(sig).to.eql(fixtures.redundantPubKey.signature)
    })
  })
})
