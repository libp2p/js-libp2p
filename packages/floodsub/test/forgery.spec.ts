/* eslint-env mocha */
import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub } from '../src/index.ts'
import { RPC } from '../src/message/rpc.ts'
import { PeerStreams } from '../src/peer-streams.ts'
import { SignPrefix } from '../src/sign.ts'
import { randomSeqno, toRpcMessage } from '../src/utils.ts'
import type { PubSubRPCMessage } from '../src/floodsub.ts'
import type { FloodSub } from '../src/index.ts'
import type { PeerId, PrivateKey, PublicKey } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

const topic = 'test-topic'
const data = uint8ArrayFromString('hello')

// a wire message claiming to be from `from`, signed by `signer` and carrying
// `key` in its key field
async function wireMessage (from: PeerId, signer: PrivateKey, key: PublicKey): Promise<PubSubRPCMessage> {
  const unsigned = toRpcMessage({
    type: 'signed',
    from,
    data,
    sequenceNumber: randomSeqno(),
    topic,
    signature: new Uint8Array(0),
    key
  })
  delete unsigned.signature
  delete unsigned.key

  const signature = await signer.sign(uint8ArrayConcat([SignPrefix, RPC.Message.encode(unsigned)]))

  return { ...unsigned, signature, key: publicKeyToProtobuf(key) }
}

describe('forged messages over the wire', () => {
  let pubsub: FloodSub
  let sender: PeerStreams
  let attackerKey: PrivateKey
  let delivered: number

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    pubsub = floodsub()({
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      registrar: stubInterface<Registrar>(),
      logger: defaultLogger()
    })
    await start(pubsub)
    pubsub.subscribe(topic)

    attackerKey = await generateKeyPair('Ed25519')
    sender = new PeerStreams(peerIdFromPrivateKey(attackerKey))
    delivered = 0
    pubsub.addEventListener('message', () => { delivered++ })
  })

  afterEach(async () => {
    await stop(pubsub)
  })

  async function receive (message: PubSubRPCMessage): Promise<void> {
    // @ts-expect-error private method
    await pubsub['processRpc'](sender, { subscriptions: [], messages: [message] })
    await pubsub.queue.onIdle()
  }

  it('delivers a message signed by its author', async () => {
    await receive(await wireMessage(sender.peerId, attackerKey, attackerKey.publicKey))

    expect(delivered).to.equal(1)
  })

  it('delivers a message relayed from a different Ed25519 author', async () => {
    const authorKey = await generateKeyPair('Ed25519')

    await receive(await wireMessage(peerIdFromPrivateKey(authorKey), authorKey, authorKey.publicKey))

    expect(delivered).to.equal(1)
  })

  it('delivers a message from an RSA author carrying its key', async () => {
    const authorKey = await generateKeyPair('RSA', 2048)

    await receive(await wireMessage(peerIdFromPrivateKey(authorKey), authorKey, authorKey.publicKey))

    expect(delivered).to.equal(1)
  })

  it('drops a message signed by the attacker claiming an Ed25519 author', async () => {
    const victim = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    await receive(await wireMessage(victim, attackerKey, attackerKey.publicKey))

    expect(delivered).to.equal(0)
  })

  // dropped as unsigned by `isSigned` before signature verification, since the
  // key does not derive to the author
  it('drops a message signed by the attacker claiming an RSA author', async () => {
    const victim = peerIdFromPrivateKey(await generateKeyPair('RSA', 2048))

    await receive(await wireMessage(victim, attackerKey, attackerKey.publicKey))

    expect(delivered).to.equal(0)
  })

  it('drops a message signed by its Ed25519 author that carries a different key', async () => {
    const authorKey = await generateKeyPair('Ed25519')

    await receive(await wireMessage(peerIdFromPrivateKey(authorKey), authorKey, attackerKey.publicKey))

    expect(delivered).to.equal(0)
  })
})
