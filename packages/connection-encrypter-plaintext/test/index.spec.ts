import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { pbStream, streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { plaintext } from '../src/index.ts'
import { Exchange } from '../src/pb/proto.ts'
import type { ConnectionEncrypter, PeerId } from '@libp2p/interface'

describe('plaintext', () => {
  let localPeer: PeerId
  let wrongPeer: PeerId
  let encrypter: ConnectionEncrypter
  let encrypterRemote: ConnectionEncrypter

  beforeEach(async () => {
    wrongPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const localKeyPair = await generateKeyPair('Ed25519')
    localPeer = peerIdFromPrivateKey(localKeyPair)

    encrypter = plaintext()({
      privateKey: localKeyPair,
      logger: defaultLogger()
    })
    encrypterRemote = plaintext()({
      privateKey: await generateKeyPair('Ed25519'),
      logger: defaultLogger()
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should reject a peer other than the expected one', async () => {
    const [inbound, outbound] = await streamPair()

    await Promise.all([
      encrypter.secureInbound(inbound),
      encrypterRemote.secureOutbound(outbound, {
        remotePeer: wrongPeer
      })
    ]).then(() => expect.fail('should have failed'), (err) => {
      expect(err).to.exist()
      expect(err).to.have.property('name', 'UnexpectedPeerError')
    })
  })

  it('should reject a public key whose type does not match its data', async () => {
    const remoteKey = await generateKeyPair('secp256k1')
    const [inbound, outbound] = await streamPair()

    const result = encrypter.secureInbound(inbound)

    // a secp256k1 key labelled as Ed25519: Type (field 1) = 1, Data (field 2)
    const data = remoteKey.publicKey.raw
    await pbStream(outbound).pb(Exchange).write({
      id: remoteKey.publicKey.toMultihash().bytes,
      pubkey: uint8ArrayConcat([Uint8Array.from([0x08, 0x01, 0x12, data.byteLength]), data])
    })

    const err = await result.catch(err => err)
    expect(err).to.have.property('name', 'InvalidCryptoExchangeError')
    expect(err.message).to.not.include('did not match id')
  })

  it('should reject a public key that does not match the exchanged id', async () => {
    const remoteKey = await generateKeyPair('Ed25519')
    const [inbound, outbound] = await streamPair()

    const result = encrypter.secureInbound(inbound)

    await pbStream(outbound).pb(Exchange).write({
      id: wrongPeer.toMultihash().bytes,
      pubkey: withArrayBuffer(publicKeyToProtobuf(remoteKey.publicKey))
    })

    const err = await result.catch(err => err)
    expect(err).to.have.property('name', 'InvalidCryptoExchangeError')
    expect(err.message).to.include('did not match id')
  })

  it('should reject an RSA peer when a different peer is expected', async () => {
    const keyPair = await generateKeyPair('RSA', 512)

    encrypter = plaintext()({
      privateKey: keyPair,
      logger: defaultLogger()
    })

    const [inbound, outbound] = await streamPair()

    await expect(Promise.all([
      encrypter.secureInbound(inbound),
      encrypterRemote.secureOutbound(outbound, {
        remotePeer: localPeer
      })
    ]))
      .to.eventually.be.rejected.with.property('name', 'UnexpectedPeerError')
  })
})
