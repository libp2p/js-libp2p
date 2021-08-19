/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { sha256 } = require('multiformats/hashes/sha2')
const { utils } = require('libp2p-interfaces/src/pubsub')
const { SignaturePolicy } = require('libp2p-interfaces/src/pubsub/signature-policy')
const PeerStreams = require('libp2p-interfaces/src/pubsub/peer-streams')
const PeerId = require('peer-id')

const Floodsub = require('../src')

const defOptions = {
  emitSelf: true,
  globalSignaturePolicy: SignaturePolicy.StrictNoSign
}

const topic = 'my-topic'
const message = uint8ArrayFromString('a neat message')

describe('floodsub', () => {
  let floodsub

  before(async () => {
    expect(Floodsub.multicodec).to.exist()

    const libp2p = {
      peerId: await PeerId.create(),
      registrar: {
        handle: () => {},
        register: () => {},
        unregister: () => {}
      }
    }

    floodsub = new Floodsub(libp2p, defOptions)
  })

  beforeEach(() => {
    floodsub.start()
  })

  afterEach(() => {
    sinon.restore()
    floodsub.stop()
  })

  it('checks cache when processing incoming message', async function () {
    const otherPeer = await PeerId.create()
    const sig = await sha256.encode(message)
    const key = uint8ArrayToString(sig, 'base64')
    let callCount = 0

    const peerStream = new PeerStreams({
      id: otherPeer,
      protocol: 'test'
    })
    const rpc = {
      subscriptions: [],
      msgs: [{
        receivedFrom: peerStream.id.toB58String(),
        data: message,
        topicIDs: [topic]
      }]
    }

    floodsub.subscribe(topic)
    floodsub.on(topic, () => {
      callCount++
    })

    // the message should not be in the cache
    expect(floodsub.seenCache.has(key)).to.be.false()

    // receive the message once
    await floodsub._processRpc(peerStream.id.toB58String(), peerStream, rpc)

    // should have received the message
    expect(callCount).to.equal(1)

    // should be in the cache now
    expect(floodsub.seenCache.has(key)).to.be.true()

    // receive the message multiple times
    await floodsub._processRpc(peerStream.id.toB58String(), peerStream, rpc)
    await floodsub._processRpc(peerStream.id.toB58String(), peerStream, rpc)
    await floodsub._processRpc(peerStream.id.toB58String(), peerStream, rpc)

    // should only have emitted the message once
    expect(callCount).to.equal(1)
  })

  it('forwards normalized messages on publish', async () => {
    sinon.spy(floodsub, '_forwardMessage')

    await floodsub.publish(topic, message)
    expect(floodsub._forwardMessage.callCount).to.equal(1)
    const [messageToEmit] = floodsub._forwardMessage.getCall(0).args

    const expected = utils.normalizeInRpcMessage(
      await floodsub._buildMessage({
        receivedFrom: floodsub.peerId.toB58String(),
        data: message,
        topicIDs: [topic]
      }))

    expect(messageToEmit).to.eql(expected)
  })

  it('does not send received message back to original sender', async () => {
    sinon.spy(floodsub, '_sendRpc')

    const sender = await PeerId.create()

    const peerStream = new PeerStreams({
      id: sender,
      protocol: 'test'
    })
    const rpc = {
      subscriptions: [],
      msgs: [{
        receivedFrom: peerStream.id.toB58String(),
        data: message,
        topicIDs: [topic]
      }]
    }

    // otherPeer is subscribed to the topic
    floodsub.topics.set(topic, new Set([sender.toB58String()]))

    // receive the message
    await floodsub._processRpc(peerStream.id.toB58String(), peerStream, rpc)

    // should not forward back to the sender
    expect(floodsub._sendRpc.called).to.be.false()
  })
})
