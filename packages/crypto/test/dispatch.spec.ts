import { expect } from 'aegir/chai'
import { createCryptoLoader, ed25519Crypto, generateKeyPair, privateKeyFromProtobuf, publicKeyFromProtobuf } from '../src/index.ts'
import { PrivateKeyMessage, PublicKeyMessage } from '../src/pb.ts'
import { secp256k1Crypto } from '../src/secp256k1.ts'

describe('dispatchers', () => {
  for (const type of ['Ed25519', 'ECDSA']) {
    it(`round-trips ${type} keys`, async () => {
      const key = await generateKeyPair(type)

      expect((await privateKeyFromProtobuf(key.toProtobuf())).toProtobuf()).to.equalBytes(key.toProtobuf())
      expect((await publicKeyFromProtobuf(key.publicKey.toProtobuf())).toProtobuf()).to.equalBytes(key.publicKey.toProtobuf())
    })
  }

  it('uses the passed loader', async () => {
    const getCrypto = createCryptoLoader([secp256k1Crypto()])
    const key = await generateKeyPair('secp256k1', { getCrypto })

    await expect(publicKeyFromProtobuf(key.publicKey.toProtobuf())).to.eventually.be.rejected.with.property('name', 'UnknownCryptoError')
    expect((await publicKeyFromProtobuf(key.publicKey.toProtobuf(), { getCrypto })).type).to.equal('secp256k1')
  })

  it('rejects bytes without a key type', async () => {
    await expect(publicKeyFromProtobuf(Uint8Array.from([0x12, 0x00]))).to.eventually.be.rejected.with.property('name', 'InvalidPublicKeyError')
  })

  for (const [type, Type] of [['RSA', 0], ['Ed25519', 1], ['ECDSA', 3]] as const) {
    it(`rejects a malformed ${type} public key with InvalidPublicKeyError`, async () => {
      const buf = PublicKeyMessage.encode({ Type, Data: Uint8Array.from([0x30, 0x03, 0x02, 0x01, 0x01]) })

      await expect(publicKeyFromProtobuf(buf)).to.eventually.be.rejected.with.property('name', 'InvalidPublicKeyError')
    })

    it(`rejects a malformed ${type} private key with InvalidPrivateKeyError`, async () => {
      const buf = PrivateKeyMessage.encode({ Type, Data: Uint8Array.from([0x30, 0x03, 0x02, 0x01, 0x01]) })

      await expect(privateKeyFromProtobuf(buf)).to.eventually.be.rejected.with.property('name', 'InvalidPrivateKeyError')
    })
  }

  it('wraps errors from a configured crypto', async () => {
    const getCrypto = createCryptoLoader([{
      ...ed25519Crypto(),
      type: 'Ed25519',
      code: 1,
      generatePrivateKey: async () => { throw new Error('nope') },
      publicKeyFromProtobuf: async () => { throw new Error('bad public key') },
      privateKeyFromProtobuf: async () => { throw new Error('bad private key') }
    }])
    const key = await generateKeyPair('Ed25519')

    await expect(publicKeyFromProtobuf(key.publicKey.toProtobuf(), { getCrypto })).to.eventually.be.rejected
      .with.property('name', 'InvalidPublicKeyError')
    await expect(privateKeyFromProtobuf(key.toProtobuf(), { getCrypto })).to.eventually.be.rejected
      .with.property('name', 'InvalidPrivateKeyError')
  })

  it('does not wrap abort errors', async () => {
    const key = await generateKeyPair('Ed25519')

    await expect(privateKeyFromProtobuf(key.toProtobuf(), { signal: AbortSignal.abort() })).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })
})
