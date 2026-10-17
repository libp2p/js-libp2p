import { expect } from 'aegir/chai'
import { ed25519Crypto } from '../src/index.ts'
import { PublicKeyMessage, PrivateKeyMessage } from '../src/pb.ts'

describe('Ed25519 key lengths', () => {
  for (const length of [0, 31, 33, 64]) {
    it(`rejects a ${length} byte public key`, async () => {
      const buf = PublicKeyMessage.encode({ Type: 1, Data: new Uint8Array(length) })
      await expect(ed25519Crypto().publicKeyFromProtobuf(buf)).to.eventually.be.rejected()
    })
  }

  for (const length of [0, 31, 33, 63, 65, 96]) {
    it(`rejects a ${length} byte private key`, async () => {
      const buf = PrivateKeyMessage.encode({ Type: 1, Data: new Uint8Array(length) })
      await expect(ed25519Crypto().privateKeyFromProtobuf(buf)).to.eventually.be.rejected()
    })
  }

  it('accepts a 32 byte seed and a 64 byte seed + public key', async () => {
    const key = await ed25519Crypto().generatePrivateKey()
    const data = PrivateKeyMessage.decode(key.toProtobuf()).Data!
    const fromSeed = await ed25519Crypto().privateKeyFromProtobuf(PrivateKeyMessage.encode({ Type: 1, Data: data.subarray(0, 32) }))
    const fromFull = await ed25519Crypto().privateKeyFromProtobuf(key.toProtobuf())

    expect(fromSeed.publicKey.toProtobuf()).to.equalBytes(key.publicKey.toProtobuf())
    expect(fromFull.publicKey.toProtobuf()).to.equalBytes(key.publicKey.toProtobuf())
  })
})
