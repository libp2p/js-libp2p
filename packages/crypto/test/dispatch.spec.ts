import { expect } from 'aegir/chai'
import { createCryptoLoader, generateKeyPair, privateKeyFromProtobuf, publicKeyFromProtobuf } from '../src/index.ts'
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
})
