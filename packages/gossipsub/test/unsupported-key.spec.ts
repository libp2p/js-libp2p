import { createCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { GossipSub as GossipSubClass } from '../src/gossipsub.ts'
import { StrictSign } from '../src/index.ts'
import { buildRawMessage } from '../src/utils/buildRawMessage.ts'
import { getPublishConfigFromPeerId } from '../src/utils/publishConfig.ts'
import type { CryptoLoader, PeerId, PeerStore } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

const topic = 'test-topic'

describe('messages signed with an unsupported key type', () => {
  const secpLoader = createCryptoLoader([secp256k1Crypto()])
  let forwarder: PeerId

  async function createNode (getCrypto?: CryptoLoader): Promise<GossipSubClass> {
    const privateKey = await generateKeyPair('Ed25519')
    const node = new GossipSubClass({
      privateKey,
      peerId: peerIdFromPrivateKey(privateKey),
      registrar: stubInterface<Registrar>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      logger: defaultLogger(),
      getCrypto
    }, { emitSelf: false })
    // @ts-expect-error private field
    node.subscriptions.add(topic)

    return node
  }

  async function secpMessage (): Promise<Awaited<ReturnType<typeof buildRawMessage>>['raw']> {
    const key = await generateKeyPair('secp256k1', { getCrypto: secpLoader })
    const config = getPublishConfigFromPeerId(StrictSign, peerIdFromPrivateKey(key), key)
    const data = uint8ArrayFromString('hello')

    return (await buildRawMessage(config, topic, data, data)).raw
  }

  async function receive (node: GossipSubClass, raw: Awaited<ReturnType<typeof secpMessage>>): Promise<{ delivered: number, rejectInvalid: sinon.SinonSpy, reject: sinon.SinonSpy }> {
    const rejectInvalid = sinon.spy(node.score, 'rejectInvalidMessage')
    const reject = sinon.spy(node.score, 'rejectMessage')
    let delivered = 0
    node.addEventListener('gossipsub:message', () => { delivered++ })

    // @ts-expect-error private method
    await node.handleReceivedMessage(forwarder, raw)

    return { delivered, rejectInvalid, reject }
  }

  before(async () => {
    forwarder = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('ignores the message without penalising the forwarder by default', async () => {
    const node = await createNode()
    const result = await receive(node, await secpMessage())

    expect(result.delivered).to.equal(0)
    expect(result.rejectInvalid.called).to.be.false()
    expect(result.reject.called).to.be.false()
  })

  it('delivers the message when the node supports the key type', async () => {
    const node = await createNode(secpLoader)
    const result = await receive(node, await secpMessage())

    expect(result.delivered).to.equal(1)
    expect(result.rejectInvalid.called).to.be.false()
    expect(result.reject.called).to.be.false()
  })

  it('still penalises a forged message from a supported key type', async () => {
    const node = await createNode()
    const victim = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const attacker = await generateKeyPair('Ed25519')
    const config = getPublishConfigFromPeerId(StrictSign, victim, attacker)
    const data = uint8ArrayFromString('hello')
    const { raw } = await buildRawMessage(config, topic, data, data)

    const result = await receive(node, raw)

    expect(result.delivered).to.equal(0)
    expect(result.rejectInvalid.called || result.reject.called).to.be.true()
  })
})
