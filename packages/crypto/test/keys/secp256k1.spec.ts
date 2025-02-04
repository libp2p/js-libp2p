/* eslint-disable @typescript-eslint/await-thenable */ // secp is sync in node, async in browsers
/* eslint-env mocha */
import { isPrivateKey, isPublicKey } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { randomBytes } from '../../src/index.js'
import { generateKeyPair, privateKeyFromRaw, privateKeyToProtobuf, publicKeyFromRaw, publicKeyToProtobuf } from '../../src/keys/index.js'
import { KeyType, PrivateKey, PublicKey } from '../../src/keys/keys.js'
import { hashAndSign, hashAndVerify } from '../../src/keys/secp256k1/index.js'
import { unmarshalSecp256k1PrivateKey, unmarshalSecp256k1PublicKey, compressSecp256k1PublicKey, computeSecp256k1PublicKey, decompressSecp256k1PublicKey, generateSecp256k1PrivateKey, validateSecp256k1PrivateKey, validateSecp256k1PublicKey } from '../../src/keys/secp256k1/utils.js'
import fixtures from '../fixtures/go-key-secp256k1.js'
import type { Secp256k1PrivateKey } from '@libp2p/interface'

describe('secp256k1 keys', () => {
  let key: Secp256k1PrivateKey

  before(async () => {
    key = await generateKeyPair('secp256k1')
  })

  it('generates a valid key', async () => {
    expect(key).to.have.property('type', 'secp256k1')
    expect(key.equals(key)).to.be.true()
    expect(key.raw).to.have.length(32)
  })

  it('signs', async () => {
    const text = randomBytes(512)
    const sig = await key.sign(text)
    const res = await key.publicKey.verify(text, sig)
    expect(res).to.equal(true)
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

  it('encoding', () => {
    const keyMarshal = key.raw
    const key2 = unmarshalSecp256k1PrivateKey(keyMarshal)
    const keyMarshal2 = key2.raw

    expect(keyMarshal).to.equalBytes(keyMarshal2)

    const pk = key.publicKey
    const pkMarshal = pk.raw
    const pk2 = unmarshalSecp256k1PublicKey(pkMarshal)
    const pkMarshal2 = pk2.raw

    expect(pkMarshal).to.equalBytes(pkMarshal2)
  })

  it('publicKey toString()', async () => {
    const decoded = PrivateKey.decode(fixtures.privateKey)
    const key = unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())

    expect(key.publicKey.toString()).to.equal('16Uiu2HAm5vpzEwJ41kQmnwDu9moFusdc16wV1oCUd1AHLgFgPpKY')
  })

  it('imports private key from raw', async () => {
    const key = await generateKeyPair('secp256k1')
    const imported = privateKeyFromRaw(key.raw)

    expect(key.equals(imported)).to.be.true()
  })

  it('imports public key from raw', async () => {
    const key = await generateKeyPair('secp256k1')
    const imported = publicKeyFromRaw(key.publicKey.raw)

    expect(key.publicKey.equals(imported)).to.be.true()
  })

  it('is PrivateKey', async () => {
    const key = await generateKeyPair('secp256k1')

    expect(isPrivateKey(key)).to.be.true()
    expect(isPublicKey(key)).to.be.false()
  })

  it('is PublicKey', async () => {
    const key = await generateKeyPair('secp256k1')

    expect(isPrivateKey(key.publicKey)).to.be.false()
    expect(isPublicKey(key.publicKey)).to.be.true()
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.be.true()

      expect(key.publicKey.equals(key.publicKey)).to.be.true()
    })

    it('not equals other key', async () => {
      const key2 = await generateKeyPair('secp256k1')
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

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.false()
  })
})

describe('crypto functions', () => {
  let privKey: Uint8Array
  let pubKey: Uint8Array

  before(() => {
    privKey = generateSecp256k1PrivateKey()
    pubKey = computeSecp256k1PublicKey(privKey)
  })

  it('generates valid keys', () => {
    expect(() => {
      validateSecp256k1PrivateKey(privKey)
      validateSecp256k1PublicKey(pubKey)
    }).to.not.throw()
  })

  it('does not validate an invalid key', () => {
    expect(() => { validateSecp256k1PublicKey(uint8ArrayFromString('42')) }).to.throw()
    expect(() => { validateSecp256k1PrivateKey(uint8ArrayFromString('42')) }).to.throw()
  })

  it('validates a correct signature', async () => {
    const sig = await hashAndSign(privKey, uint8ArrayFromString('hello'))
    const valid = await hashAndVerify(pubKey, sig, uint8ArrayFromString('hello'))
    expect(valid).to.equal(true)
  })

  it('does not validate when validating a message with an invalid signature', async () => {
    const result = await hashAndVerify(pubKey, uint8ArrayFromString('invalid-sig'), uint8ArrayFromString('hello'))

    expect(result).to.be.false()
  })

  it('errors if given a null Uint8Array to sign', async () => {
    await expect((async () => {
      // @ts-expect-error incorrect args
      await hashAndSign(privKey, null)
    })()).to.eventually.be.rejected()
  })

  it('errors when signing with an invalid key', async () => {
    await expect((async () => {
      await hashAndSign(uint8ArrayFromString('42'), uint8ArrayFromString('Hello'))
    })()).to.eventually.be.rejected
      .with.property('name', 'SigningError')
  })

  it('errors if given a null Uint8Array to validate', async () => {
    const sig = await hashAndSign(privKey, uint8ArrayFromString('hello'))

    await expect((async () => {
      // @ts-expect-error incorrect args
      await hashAndVerify(privKey, sig, null)
    })()).to.eventually.be.rejected()
  })

  it('throws when compressing an invalid public key', () => {
    expect(() => compressSecp256k1PublicKey(uint8ArrayFromString('42'))).to.throw()
  })

  it('throws when decompressing an invalid public key', () => {
    expect(() => decompressSecp256k1PublicKey(uint8ArrayFromString('42'))).to.throw()
  })

  it('compresses/decompresses a valid public key', () => {
    const decompressed = decompressSecp256k1PublicKey(pubKey)
    expect(decompressed).to.exist()
    expect(decompressed).to.have.lengthOf(65)
    const recompressed = compressSecp256k1PublicKey(decompressed)
    expect(recompressed).to.equalBytes(pubKey)
  })
})

describe('go interop', () => {
  it('loads a private key marshaled by go-libp2p-crypto', () => {
    // we need to first extract the key data from the protobuf, which is
    // normally handled by js-libp2p-crypto
    const decoded = PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.equal(KeyType.secp256k1)

    const key = unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())
    expect(privateKeyToProtobuf(key)).to.equalBytes(fixtures.privateKey)
  })

  it('loads a public key marshaled by go-libp2p-crypto', () => {
    const decoded = PublicKey.decode(fixtures.publicKey)
    expect(decoded.Type).to.equal(KeyType.secp256k1)

    const key = unmarshalSecp256k1PublicKey(decoded.Data ?? new Uint8Array())
    expect(publicKeyToProtobuf(key)).to.equalBytes(fixtures.publicKey)
  })

  it('generates the same signature as go-libp2p-crypto', async () => {
    const decoded = PrivateKey.decode(fixtures.privateKey)
    expect(decoded.Type).to.equal(KeyType.secp256k1)

    const key = unmarshalSecp256k1PrivateKey(decoded.Data ?? new Uint8Array())
    const sig = await key.sign(fixtures.message)
    expect(sig).to.equalBytes(fixtures.signature)
  })
})
