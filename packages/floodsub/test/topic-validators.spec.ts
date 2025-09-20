import { generateKeyPair } from '@libp2p/crypto/keys'
import { start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub, TopicValidatorResult } from '../src/index.js'
import { PeerStreams } from '../src/peer-streams.js'
import type { PubSubRPC } from '../src/floodsub.js'
import type { FloodSub } from '../src/index.js'
import type { PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

describe('topic validators', () => {
  let pubsub: FloodSub
  let otherPeerId: PeerId

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)
    otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    pubsub = floodsub({
      globalSignaturePolicy: 'StrictNoSign'
    })({
      peerId,
      privateKey,
      registrar: stubInterface<Registrar>(),
      logger: defaultLogger()
    })

    await start(pubsub)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should filter messages by topic validator', async () => {
    // use publishMessage.callCount() to see if a message is valid or not
    // @ts-expect-error private method
    const publishMessageSpy = sinon.spy(pubsub, 'publishMessage')
    // @ts-expect-error not all fields are implemented in return value
    sinon.stub(pubsub.peers, 'get').returns({})
    const filteredTopic = 't'
    const peer = new PeerStreams({
      logger: defaultLogger()
    }, { id: otherPeerId, protocol: 'a-protocol' })

    // Set a trivial topic validator
    pubsub.topicValidators.set(filteredTopic, async (_otherPeerId, message) => {
      if (!uint8ArrayEquals(message.data, uint8ArrayFromString('a message'))) {
        return TopicValidatorResult.Reject
      }
      return TopicValidatorResult.Accept
    })

    // valid case
    const validRpc: PubSubRPC = {
      subscriptions: [],
      messages: [{
        from: otherPeerId.toMultihash().bytes,
        data: uint8ArrayFromString('a message'),
        topic: filteredTopic
      }]
    }

    // process valid message
    pubsub.subscribe(filteredTopic)
    // @ts-expect-error private method
    void pubsub.processRpc(peer.id, peer, validRpc)

    // @ts-expect-error .callCount is a property added by sinon
    await pWaitFor(() => pubsub.publishMessage.callCount === 1)

    // invalid case
    const invalidRpc = {
      subscriptions: [],
      messages: [{
        data: uint8ArrayFromString('a different message'),
        topic: filteredTopic
      }]
    }

    // @ts-expect-error private method
    void pubsub.processRpc(peer.id, peer, invalidRpc)

    // @ts-expect-error .callCount is a property added by sinon
    expect(pubsub.publishMessage.callCount).to.eql(1)

    // remove topic validator
    pubsub.topicValidators.delete(filteredTopic)

    // another invalid case
    const invalidRpc2: PubSubRPC = {
      subscriptions: [],
      messages: [{
        from: otherPeerId.toMultihash().bytes,
        data: uint8ArrayFromString('a different message'),
        topic: filteredTopic
      }]
    }

    // process previously invalid message, now is valid
    // @ts-expect-error private method
    void pubsub.processRpc(peer.id, peer, invalidRpc2)
    pubsub.unsubscribe(filteredTopic)

    await pWaitFor(() => publishMessageSpy.callCount === 2)
  })
})
