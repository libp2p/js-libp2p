/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { sha256 } from 'multiformats/hashes/sha2'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { FloodSub } from '../src/floodsub.js'
import { protocol, StrictNoSign } from '../src/index.js'
import { PeerStream } from '../src/peer-stream.js'
import type { PubSubRPC } from '../src/floodsub.js'
import type { Message } from '../src/index.js'
import type { Stream } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const topic = 'my-topic'
const message = uint8ArrayFromString('a neat message')

describe('floodsub', () => {
  let pubsub: FloodSub
  let registrar: StubbedInstance<Registrar>

  before(async () => {
    expect(protocol).to.exist()

    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)
    registrar = stubInterface()

    pubsub = new FloodSub({
      peerId,
      privateKey,
      registrar,
      logger: defaultLogger()
    }, {
      emitSelf: true,
      globalSignaturePolicy: StrictNoSign
    })
  })

  beforeEach(async () => {
    await start(pubsub)
  })

  afterEach(async () => {
    sinon.restore()
    await stop(pubsub)
  })

  it('checks cache when processing incoming message', async function () {
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const sig = await sha256.encode(message)
    const key = uint8ArrayToString(sig, 'base64')
    let callCount = 0

    const peerStream = new PeerStream(otherPeer, stubInterface<Stream>())
    const rpc: PubSubRPC = {
      subscriptions: [],
      messages: [{
        from: otherPeer.toMultihash().bytes,
        data: message,
        topic
      }]
    }

    pubsub.subscribe(topic)
    pubsub.addEventListener('message', (evt: any) => {
      if (evt.detail.topic === topic) {
        callCount++
      }
    })

    // the message should not be in the cache
    expect(pubsub.seenCache.has(key)).to.be.false()

    // receive the message once
    await pubsub.processRpc(peerStream, rpc)
    await pubsub.queue.onIdle()

    // should have received the message
    expect(callCount).to.equal(1)

    // should be in the cache now
    expect(pubsub.seenCache.has(key)).to.be.true()

    // receive the message multiple times
    await pubsub.processRpc(peerStream, rpc)
    await pubsub.processRpc(peerStream, rpc)
    await pubsub.processRpc(peerStream, rpc)

    // should only have emitted the message once
    expect(callCount).to.equal(1)
  })

  it('forwards normalized messages on publish', async () => {
    const spy = sinon.spy(pubsub, 'send')

    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    pubsub.getSubscribers = () => {
      return [otherPeer]
    }

    expect(pubsub.send).to.have.property('callCount', 0)
    await pubsub.publish(topic, message)

    await pWaitFor(async () => spy.callCount === 1)

    const [to, rpc] = spy.getCall(0).args

    const expected: Message = {
      type: 'unsigned',
      data: message,
      topic
    }

    expect(to).to.eql(otherPeer)
    expect(rpc).to.have.nested.property('messages[0]').that.containSubset(expected)
  })

  it('does not send received message back to original sender', async () => {
    sinon.spy(pubsub, 'sendRpc')

    const sender = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const peerStream = new PeerStream(sender, stubInterface<Stream>())
    const rpc: PubSubRPC = {
      subscriptions: [],
      messages: [{
        from: sender.toMultihash().bytes,
        data: message,
        topic
      }]
    }

    // otherPeer is subscribed to the topic
    const peerSet = new PeerSet()
    peerSet.add(sender)
    pubsub.topics.set(topic, peerSet)

    // receive the message
    await pubsub.processRpc(peerStream, rpc)

    // should not forward back to the sender
    expect(pubsub.sendRpc).to.have.property('called', false)
  })
})
