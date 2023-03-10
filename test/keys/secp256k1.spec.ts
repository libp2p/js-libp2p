/* eslint-env mocha */
import { expect } from 'aegir/chai'
import * as crypto from '../../src/index.js'
import * as Secp256k1 from '../../src/keys/secp256k1-class.js'
import * as secp256k1Crypto from '../../src/keys/secp256k1.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import fixtures from '../fixtures/go-key-secp256k1.js'

const secp256k1 = crypto.keys.supportedKeys.secp256k1
const keysPBM = crypto.keys.keysPBM
const randomBytes = crypto.randomBytes

describe('secp256k1 keys', () => {
  let key: Secp256k1.Secp256k1PrivateKey

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
    const _key = await secp256k1.generateKeyPair()
    expect(_key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.public.verify(text, sig)
    expect(res).to.equal(true)
  })

  it('encoding', () => {
    const keyMarshal = key.marshal()
    const key2 = secp256k1.unmarshalSecp256k1PrivateKey(keyMarshal)
    const keyMarshal2 = key2.marshal()

    expect(keyMarshal).to.eql(keyMarshal2)

    const pk = key.public
    const pkMarshal = pk.marshal()
    const pk2 = secp256k1.unmarshalSecp256k1PublicKey(pkMarshal)
    const pkMarshal2 = pk2.marshal()

    expect(pkMarshal).to.eql(pkMarshal2)
  })

  it('key id', async () => {
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    const key = secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())
    const id = await key.id()
    expect(id).to.eql('QmPCyMBGEyifPtx5aa6k6wkY9N1eBf9vHK1eKfNc35q9uq')
  })

  it('should export a password encrypted libp2p-key', async () => {
    const key = await crypto.keys.generateKeyPair('secp256k1')

    if (!(key instanceof Secp256k1.Secp256k1PrivateKey)) {
      throw new Error('Generated wrong key type')
    }

    const encryptedKey = await key.export('my secret')
    // Import the key
    const importedKey = await crypto.keys.importKey(encryptedKey, 'my secret')

    if (!(importedKey instanceof Secp256k1.Secp256k1PrivateKey)) {
      throw new Error('Imported wrong key type')
    }

    expect(key.equals(importedKey)).to.equal(true)
  })

  it('should fail to import libp2p-key with wrong password', async () => {
    const key = await crypto.keys.generateKeyPair('secp256k1')
    const encryptedKey = await key.export('my secret', 'libp2p-key')

    await expect(crypto.keys.importKey(encryptedKey, 'not my secret')).to.eventually.be.rejected()
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.eql(true)

      expect(key.public.equals(key.public)).to.eql(true)
    })

    it('not equals other key', async () => {
      const key2 = await secp256k1.generateKeyPair()
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

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.eql(false)
  })
})

describe('crypto functions', () => {
  let privKey: Uint8Array
  let pubKey: Uint8Array

  before(() => {
    privKey = secp256k1Crypto.generateKey()
    pubKey = secp256k1Crypto.computePublicKey(privKey)
  })

  it('generates valid keys', () => {
    expect(() => {
      secp256k1Crypto.validatePrivateKey(privKey)
      secp256k1Crypto.validatePublicKey(pubKey)
    }).to.not.throw()
  })

  it('does not validate an invalid key', () => {
    expect(() => { secp256k1Crypto.validatePublicKey(uint8ArrayFromString('42')) }).to.throw()
    expect(() => { secp256k1Crypto.validatePrivateKey(uint8ArrayFromString('42')) }).to.throw()
  })

  it('validates a correct signature', async () => {
    const sig = await secp256k1Crypto.hashAndSign(privKey, uint8ArrayFromString('hello'))
    const valid = await secp256k1Crypto.hashAndVerify(pubKey, sig, uint8ArrayFromString('hello'))
    expect(valid).to.equal(true)
  })

  it('does not validate when validating a message with an invalid signature', async () => {
    const result = await secp256k1Crypto.hashAndVerify(pubKey, uint8ArrayFromString('invalid-sig'), uint8ArrayFromString('hello'))

    expect(result).to.be.false()
  })

  it('errors if given a null Uint8Array to sign', async () => {
    // @ts-expect-error
    await expect(secp256k1Crypto.hashAndSign(privKey, null)).to.eventually.be.rejected()
  })

  it('errors when signing with an invalid key', async () => {
    await expect(secp256k1Crypto.hashAndSign(uint8ArrayFromString('42'), uint8ArrayFromString('Hello'))).to.eventually.be.rejected.with.property('code', 'ERR_INVALID_INPUT')
  })

  it('errors if given a null Uint8Array to validate', async () => {
    const sig = await secp256k1Crypto.hashAndSign(privKey, uint8ArrayFromString('hello'))

    // @ts-expect-error
    await expect(secp256k1Crypto.hashAndVerify(privKey, sig, null)).to.eventually.be.rejected()
  })

  it('throws when compressing an invalid public key', () => {
    expect(() => secp256k1Crypto.compressPublicKey(uint8ArrayFromString('42'))).to.throw()
  })

  it('throws when decompressing an invalid public key', () => {
    expect(() => secp256k1Crypto.decompressPublicKey(uint8ArrayFromString('42'))).to.throw()
  })

  it('compresses/decompresses a valid public key', () => {
    const decompressed = secp256k1Crypto.decompressPublicKey(pubKey)
    expect(decompressed).to.exist()
    expect(decompressed.length).to.be.eql(65)
    const recompressed = secp256k1Crypto.compressPublicKey(decompressed)
    expect(recompressed).to.eql(pubKey)
  })
})

describe('go interop', () => {
  it('loads a private key marshaled by go-libp2p-crypto', () => {
    // we need to first extract the key data from the protobuf, which is
    // normally handled by js-libp2p-crypto
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    const key = secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PrivateKey)
    expect(key.bytes).to.eql(fixtures.privateKey)
  })

  it('loads a public key marshaled by go-libp2p-crypto', () => {
    const decoded = keysPBM.PublicKey.decode(fixtures.publicKey)
    expect(decoded.Type).to.be.eql(keysPBM.KeyType.Secp256k1)

    const key = secp256k1.unmarshalSecp256k1PublicKey(decoded.Data ?? new Uint8Array())
    expect(key).to.be.an.instanceof(secp256k1.Secp256k1PublicKey)
    expect(key.bytes).to.eql(fixtures.publicKey)
  })

  it('generates the same signature as go-libp2p-crypto', async () => {
    const decoded = keysPBM.PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.eql(keysPBM.KeyType.Secp256k1)

    const key = secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())
    const sig = await key.sign(fixtures.message)
    expect(sig).to.eql(fixtures.signature)
  })
})
