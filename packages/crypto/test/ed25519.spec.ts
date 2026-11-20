import { expect } from 'aegir/chai'
import { ed25519Crypto } from '../src/index.ts'
import { PublicKeyMessage, PrivateKeyMessage } from '../src/pb.ts'

describe('Ed25519 key lengths', () => {
  for (const length of [0, 31, 33, 64]) {
    it(`rejects a ${length} byte public key`, async () => {
      const buf = PublicKeyMessage.encode({ Type: 1, Data: new Uint8Array(length) })
      await expect(ed25519Crypto().publicKeyFromProtobuf(buf)).to.eventually.be.rejected.with.property('name', 'InvalidPublicKeyError')
    })
  }

  for (const length of [0, 31, 33, 63, 65, 95, 97]) {
    it(`rejects a ${length} byte private key`, async () => {
      const buf = PrivateKeyMessage.encode({ Type: 1, Data: new Uint8Array(length) })
      await expect(ed25519Crypto().privateKeyFromProtobuf(buf)).to.eventually.be.rejected.with.property('name', 'InvalidPrivateKeyError')
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

  it('accepts a 96 byte legacy go-libp2p key with a redundant public key', async () => {
    const key = await ed25519Crypto().generatePrivateKey()
    const data = PrivateKeyMessage.decode(key.toProtobuf()).Data!
    const legacy = new Uint8Array(96)
    legacy.set(data, 0)
    legacy.set(data.subarray(32), 64)
    const parsed = await ed25519Crypto().privateKeyFromProtobuf(PrivateKeyMessage.encode({ Type: 1, Data: legacy }))

    expect(parsed.publicKey.toProtobuf()).to.equalBytes(key.publicKey.toProtobuf())
    expect(parsed.toProtobuf()).to.equalBytes(key.toProtobuf())
  })
})
