/* eslint-env mocha */
import { isPrivateKey, isPublicKey } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { randomBytes } from '../../src/index.js'
import { unmarshalEd25519PrivateKey, unmarshalEd25519PublicKey } from '../../src/keys/ed25519/utils.js'
import { generateKeyPair, generateKeyPairFromSeed, privateKeyFromProtobuf, privateKeyFromRaw, publicKeyFromProtobuf, publicKeyFromRaw, privateKeyToCryptoKeyPair } from '../../src/keys/index.js'
import fixtures from '../fixtures/go-key-ed25519.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import type { Ed25519PrivateKey } from '@libp2p/interface'
import { hashAndSignNoble, hashAndVerifyNoble } from '../../src/keys/ed25519/index.browser.ts'

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
    const seededKey = await generateKeyPairFromSeed('Ed25519', seed)
    expect(seededKey).to.have.property('type', 'Ed25519')
    expect(key.raw).to.have.length(64)
    expect(key.publicKey.raw).to.have.length(32)
  })

  it('generates the same key from the same seed', async () => {
    const seed = randomBytes(32)
    const seededKey1 = await generateKeyPairFromSeed('Ed25519', seed)
    const seededKey2 = await generateKeyPairFromSeed('Ed25519', seed)
    expect(seededKey1.equals(seededKey2)).to.be.true()
    expect(seededKey1.publicKey.equals(seededKey2.publicKey)).to.be.true()
  })

  it('generates different keys for different seeds', async () => {
    const seed1 = randomBytes(32)
    const seededKey1 = await generateKeyPairFromSeed('Ed25519', seed1)
    const seed2 = randomBytes(32)
    const seededKey2 = await generateKeyPairFromSeed('Ed25519', seed2)
    expect(seededKey1.equals(seededKey2)).to.be.false()
    expect(seededKey1.publicKey.equals(seededKey2.publicKey)).to.be.false()
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.publicKey.verify(text, sig)
    expect(res).to.be.be.true()
  })

  it('signs using noble', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await hashAndVerifyNoble(key.publicKey.raw, sig, text)
    expect(res).to.be.be.true()
  })

  it('verifies using noble', async () => {
    const text = randomBytes(512)
    const sig = await hashAndSignNoble(key.raw, text)
    const res = await key.publicKey.verify(text, sig)
    expect(res).to.be.be.true()
  })

  it('signs a list', async () => {
    const text = new Uint8ArrayList(
      randomBytes(512),
      randomBytes(512)
    )
    const sig = await key.sign(text)

    expect(await key.sign(text.subarray()))
      .to.deep.equal(sig, 'list did not have same signature as a single buffer')

    expect(await key.publicKey.verify(text, sig))
      .to.be.true('did not verify message as list')
    expect(await key.publicKey.verify(text.subarray(), sig))
      .to.be.true('did not verify message as single buffer')
  })

  it('should abort signing', async () => {
    const controller = new AbortController()
    controller.abort()
    const text = randomBytes(512)
    await expect((async () => {
      return key.sign(text, {
        signal: controller.signal
      })
    })()).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })

  it('should abort verifying', async () => {
    const controller = new AbortController()
    controller.abort()
    const text = randomBytes(512)
    const sig = await key.sign(text)

    await expect((async () => {
      return key.publicKey.verify(text, sig, {
        signal: controller.signal
      })
    })()).to.eventually.be.rejected
      .with.property('name', 'AbortError')
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
    const key = privateKeyFromProtobuf(fixtures.verify.privateKey)
    expect(key.publicKey.toString()).to.eql('12D3KooWLqLxEfJ9nDdEe8Kh8PFvNPQRYDQBwyL7CMM7HhVd5LsX')
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
    const valid = await key.publicKey.verify(data, sig)
    expect(valid).to.be.true()
  })

  it('sign and verify from seed', async () => {
    const seed = new Uint8Array(32).fill(1)
    const seededKey = await generateKeyPairFromSeed('Ed25519', seed)
    const data = uint8ArrayFromString('hello world')
    const sig = await seededKey.sign(data)
    const valid = await seededKey.publicKey.verify(data, sig)
    expect(valid).to.be.true()
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.be.false()
  })

  it('throws error instead of crashing', () => {
    const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2)
    testGarbage('unmarshalPrivateKey', privateKeyFromProtobuf)
  })

  it('imports private key from raw', async () => {
    const key = await generateKeyPair('Ed25519')
    const imported = privateKeyFromRaw(key.raw)

    expect(key.equals(imported)).to.be.true()
  })

  it('imports public key from raw', async () => {
    const key = await generateKeyPair('Ed25519')
    const imported = publicKeyFromRaw(key.publicKey.raw)

    expect(key.publicKey.equals(imported)).to.be.true()
  })

  it('is PrivateKey', async () => {
    const key = await generateKeyPair('Ed25519')

    expect(isPrivateKey(key)).to.be.true()
    expect(isPublicKey(key)).to.be.false()
  })

  it('is PublicKey', async () => {
    const key = await generateKeyPair('Ed25519')

    expect(isPrivateKey(key.publicKey)).to.be.false()
    expect(isPublicKey(key.publicKey)).to.be.true()
  })

  it('fails to export to CryptoKeyPair', async () => {
    const key = await generateKeyPair('Ed25519')

    await expect(privateKeyToCryptoKeyPair(key)).to.eventually.be.rejected
      .with.property('message', 'Only RSA and ECDSA keys are supported')
  })

  describe('go interop', () => {
    it('verifies with data from go', async () => {
      const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.be.true()
    })

    it('verifies with data from go using noble', async () => {
      const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
      const ok = await hashAndVerifyNoble(key.raw, fixtures.verify.signature, fixtures.verify.data)
      expect(ok).to.be.true()
    })

    it('does not include the redundant public key when marshalling privatekey', async () => {
      const key = privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
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
      const key = privateKeyFromProtobuf(fixtures.verify.privateKey)
      const sig = await key.sign(fixtures.verify.data)
      expect(sig).to.eql(fixtures.verify.signature)
    })

    it('generates the same signature as go using nobel', async () => {
      const key = privateKeyFromProtobuf(fixtures.verify.privateKey)
      const sig = await hashAndSignNoble(key.raw, fixtures.verify.data)
      expect(sig).to.eql(fixtures.verify.signature)
    })

    it('generates the same signature as go with redundant public key', async () => {
      const key = privateKeyFromProtobuf(fixtures.redundantPubKey.privateKey)
      const sig = await key.sign(fixtures.redundantPubKey.data)
      expect(sig).to.eql(fixtures.redundantPubKey.signature)
    })
  })
})
