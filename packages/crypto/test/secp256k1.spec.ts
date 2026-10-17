import { secp256k1 as secp } from '@noble/curves/secp256k1.js'
import { expect } from 'aegir/chai'
import { PublicKeyMessage } from '../src/pb.ts'
import { secp256k1Crypto } from '../src/secp256k1.ts'
import goSecp256k1Key from './fixtures/go-key-secp256k1.ts'

describe('secp256k1', () => {
  const impl = secp256k1Crypto()

  it('signs and verifies', async () => {
    const key = await impl.generatePrivateKey()
    const data = new TextEncoder().encode('hello')

    expect(await key.publicKey.verify(data, await key.sign(data))).to.be.true()
    expect(await key.publicKey.verify(new TextEncoder().encode('other'), await key.sign(data))).to.be.false()
  })

  it('round-trips protobufs', async () => {
    const key = await impl.generatePrivateKey()
    const priv = await impl.privateKeyFromProtobuf(key.toProtobuf())
    const pub = await impl.publicKeyFromProtobuf(key.publicKey.toProtobuf())

    expect(priv.toProtobuf()).to.equalBytes(key.toProtobuf())
    expect(pub.toProtobuf()).to.equalBytes(key.publicKey.toProtobuf())
  })

  it('verifies go-libp2p signatures', async () => {
    const key = await impl.privateKeyFromProtobuf(goSecp256k1Key.privateKey)

    expect(key.publicKey.toProtobuf()).to.equalBytes(goSecp256k1Key.publicKey)
    expect(await key.publicKey.verify(goSecp256k1Key.message, goSecp256k1Key.signature)).to.be.true()
  })

  it('keeps uncompressed key bytes', async () => {
    const uncompressed = secp.getPublicKey(secp.utils.randomSecretKey(), false)
    const buf = PublicKeyMessage.encode({ Type: 2, Data: uncompressed })
    const key = await impl.publicKeyFromProtobuf(buf)

    expect(key.toProtobuf()).to.equalBytes(buf)
  })

  it('rejects an invalid point', async () => {
    const buf = PublicKeyMessage.encode({ Type: 2, Data: new Uint8Array(33) })
    await expect(impl.publicKeyFromProtobuf(buf)).to.eventually.be.rejected.with.property('name', 'InvalidPublicKeyError')
  })

  it('exports a JWK', async () => {
    const jwk = (await impl.generatePrivateKey()).toJWK()

    expect(jwk).to.include({ kty: 'EC', crv: 'secp256k1' })
    expect(jwk).to.have.property('d')
  })
})
