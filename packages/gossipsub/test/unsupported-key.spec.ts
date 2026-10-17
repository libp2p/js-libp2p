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
import { RejectReason } from '../src/types.ts'
import { buildRawMessage, validateToRawMessage } from '../src/utils/buildRawMessage.ts'
import { msgIdFnStrictSign } from '../src/utils/msgIdFn.ts'
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
    // recorded with the Ignore reason, which never penalises the sender
    expect(result.reject.calledOnce).to.be.true()
    expect(result.reject.firstCall.args[3]).to.equal(RejectReason.Ignore)
  })

  it('delivers the message when the node supports the key type', async () => {
    const node = await createNode(secpLoader)
    const result = await receive(node, await secpMessage())

    expect(result.delivered).to.equal(1)
    expect(result.rejectInvalid.called).to.be.false()
    expect(result.reject.called).to.be.false()
  })

  it('marks the message as seen and resolves the iwant promise', async () => {
    const node = await createNode()
    const raw = await secpMessage()
    const valid = await validateToRawMessage(StrictSign, raw, { getCrypto: secpLoader })

    if (!valid.valid) {
      throw new Error('message should be valid with secp256k1 configured')
    }

    const msgId = msgIdFnStrictSign(valid.message)
    // @ts-expect-error private field
    const msgIdStr = node.msgIdToStrFn(msgId)
    const forwarderStr = forwarder.toString()
    const ihave = [{ topicID: topic, messageIDs: [msgId] }]

    node.mesh.set(topic, new Set())

    // @ts-expect-error private method
    const iwant = node.handleIHave(forwarderStr, ihave)
    expect(iwant).to.have.lengthOf(1)
    node.gossipTracer.addPromise(forwarderStr, [msgId])
    expect(node.gossipTracer.size).to.equal(1)

    const scoreBefore = node.score.score(forwarderStr)
    await receive(node, raw)

    // @ts-expect-error private field
    expect(node.seenCache.has(msgIdStr)).to.be.true()
    expect(node.gossipTracer.size).to.equal(0)
    expect(node.gossipTracer.getBrokenPromises().size).to.equal(0)
    expect(node.score.score(forwarderStr)).to.equal(scoreBefore)

    // advertised again, no further iwant
    // @ts-expect-error private method
    expect(node.handleIHave(forwarderStr, ihave)).to.have.lengthOf(0)
  })

  for (const [name, keyBytes] of [
    ['a secp256k1', async () => (await generateKeyPair('secp256k1', { getCrypto: secpLoader })).publicKey.toProtobuf()],
    ['a Type 99', async () => Uint8Array.from([0x08, 99, 0x12, 4, 1, 2, 3, 4])]
  ] as const) {
    it(`rejects and penalises an Ed25519 author carrying ${name} key`, async () => {
      const node = await createNode()
      const author = await generateKeyPair('Ed25519')
      const config = getPublishConfigFromPeerId(StrictSign, peerIdFromPrivateKey(author), author)
      const data = uint8ArrayFromString('hello')
      const { raw } = await buildRawMessage(config, topic, data, data)
      raw.key = await keyBytes()

      const result = await receive(node, raw)

      expect(result.delivered).to.equal(0)
      expect(result.rejectInvalid.calledOnce).to.be.true()
    })
  }

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
