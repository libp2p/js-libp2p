/* eslint-env mocha */
import { isPrivateKey, isPublicKey } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { randomBytes } from '../../src/index.js'
import { privateKeyFromProtobuf, privateKeyFromRaw, privateKeyToProtobuf, publicKeyFromProtobuf, publicKeyFromRaw, publicKeyToProtobuf, generateKeyPair } from '../../src/keys/index.js'
import { KeyType } from '../../src/keys/keys.js'
import { getMLDSABackend, getMLDSASignatureLength, setMLDSABackend } from '../../src/keys/mldsa/index.js'
import webcrypto from '../../src/webcrypto/index.js'
import { unmarshalMLDSAPrivateKey, unmarshalMLDSAPublicKey } from '../../src/keys/mldsa/utils.js'
import type { MLDSAPrivateKey } from '@libp2p/interface'

describe('mldsa keys', function () {
  this.timeout(60 * 1000)

  let key: MLDSAPrivateKey

  before(async () => {
    key = await generateKeyPair('MLDSA')
  })

  afterEach(() => {
    setMLDSABackend('auto')
  })

  it('generates a valid key', async () => {
    expect(key).to.have.property('type', 'MLDSA')
    expect(key).to.have.property('variant', 'MLDSA65')
    expect(key.equals(key)).to.be.true()
  })

  it('generates variant-specific keys', async () => {
    const key44 = await generateKeyPair('MLDSA', 'MLDSA44')
    const key87 = await generateKeyPair('MLDSA', 'MLDSA87')

    expect(key44.variant).to.equal('MLDSA44')
    expect(key87.variant).to.equal('MLDSA87')
  })

  it('signs and verifies', async () => {
    const data = randomBytes(256)
    const sig = await key.sign(data)

    expect(sig).to.have.length(getMLDSASignatureLength(key.variant))
    expect(await key.publicKey.verify(data, sig)).to.be.true()
  })

  it('fails to verify for different data', async () => {
    const data = randomBytes(256)
    const sig = await key.sign(data)

    expect(await key.publicKey.verify(randomBytes(256), sig)).to.be.false()
  })

  it('encoding', () => {
    const keyMarshal = key.raw
    const key2 = unmarshalMLDSAPrivateKey(keyMarshal)
    const keyMarshal2 = key2.raw

    expect(keyMarshal).to.equalBytes(keyMarshal2)

    const pkMarshal = key.publicKey.raw
    const pk2 = unmarshalMLDSAPublicKey(pkMarshal)
    const pkMarshal2 = pk2.raw

    expect(pkMarshal).to.equalBytes(pkMarshal2)
  })

  it('marshals and unmarshals protobuf private key', () => {
    const encoded = privateKeyToProtobuf(key)
    const decoded = privateKeyFromProtobuf(encoded)

    expect(decoded.type).to.equal('MLDSA')
    expect(decoded.equals(key)).to.be.true()
    expect(decoded.publicKey.equals(key.publicKey)).to.be.true()
  })

  it('marshals and unmarshals protobuf public key', () => {
    const encoded = publicKeyToProtobuf(key.publicKey)
    const decoded = publicKeyFromProtobuf(encoded)

    expect(decoded.type).to.equal('MLDSA')
    expect(decoded.equals(key.publicKey)).to.be.true()
  })

  it('imports private key from raw', async () => {
    const key = await generateKeyPair('MLDSA', 'MLDSA44')
    const imported = privateKeyFromRaw(key.raw)

    expect(key.equals(imported)).to.be.true()
  })

  it('imports public key from raw', async () => {
    const key = await generateKeyPair('MLDSA', 'MLDSA44')
    const imported = publicKeyFromRaw(key.publicKey.raw)

    expect(key.publicKey.equals(imported)).to.be.true()
  })

  it('is PrivateKey', async () => {
    const key = await generateKeyPair('MLDSA')

    expect(isPrivateKey(key)).to.be.true()
    expect(isPublicKey(key)).to.be.false()
  })

  it('is PublicKey', async () => {
    const key = await generateKeyPair('MLDSA')

    expect(isPrivateKey(key.publicKey)).to.be.false()
    expect(isPublicKey(key.publicKey)).to.be.true()
  })

  it('uses protobuf key type enum', async () => {
    const key = await generateKeyPair('MLDSA')

    expect(publicKeyFromProtobuf(publicKeyToProtobuf(key.publicKey)).type).to.equal('MLDSA')
    expect(privateKeyFromProtobuf(privateKeyToProtobuf(key)).type).to.equal('MLDSA')
    expect(KeyType.MLDSA).to.equal('MLDSA')
  })

  it('supports backend selection', async () => {
    setMLDSABackend('noble')
    expect(getMLDSABackend()).to.equal('noble')

    const data = randomBytes(128)
    const sig = await key.sign(data)
    expect(await key.publicKey.verify(data, sig)).to.equal(true)

    setMLDSABackend('auto')
    expect(getMLDSABackend()).to.equal('auto')

    const sig2 = await key.sign(data)
    expect(await key.publicKey.verify(data, sig2)).to.equal(true)

    setMLDSABackend('node-subtle')
    expect(getMLDSABackend()).to.equal('node-subtle')

    const sig3 = await key.sign(data)
    expect(await key.publicKey.verify(data, sig3)).to.equal(true)
  })

  it('reports webcrypto ML-DSA capability', async function () {
    const subtle = webcrypto.get().subtle
    const capabilities: Record<string, boolean> = {}

    for (const name of ['ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87']) {
      try {
        const keyPair = await subtle.generateKey({ name }, false, ['sign', 'verify']) as CryptoKeyPair
        capabilities[name] = keyPair.privateKey != null && keyPair.publicKey != null
      } catch {
        capabilities[name] = false
      }
    }

    console.log('ML-DSA subtle capability:', capabilities)

    expect(capabilities).to.have.property('ML-DSA-65')
  })
})
