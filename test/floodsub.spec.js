/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const uint8ArrayFromString = require('uint8arrays/from-string')

const { utils } = require('libp2p-interfaces/src/pubsub')
const pWaitFor = require('p-wait-for')

const Floodsub = require('../src')
const { createPeers } = require('./utils/create-peer')

const defOptions = {
  emitSelf: true
}

const topic = 'my-topic'
const message = uint8ArrayFromString('a neat message')

describe('floodsub', () => {
  let floodsub1, floodsub2
  let peer1, peer2

  before(async () => {
    expect(Floodsub.multicodec).to.exist()

    ;[peer1, peer2] = await createPeers({ number: 2 })
    floodsub1 = new Floodsub(peer1, defOptions)
    floodsub2 = new Floodsub(peer2, defOptions)
  })

  beforeEach(() => {
    return Promise.all([
      floodsub1.start(),
      floodsub2.start()
    ])
  })

  afterEach(async () => {
    sinon.restore()
    await floodsub1.stop()
    await floodsub2.stop()
    await peer1.stop()
    await peer2.stop()
  })

  it('checks cache when processing incoming message', async () => {
    sinon.spy(floodsub2.seenCache, 'has')
    sinon.spy(floodsub2.seenCache, 'put')
    sinon.spy(floodsub2, '_processRpcMessage')
    sinon.spy(floodsub2, '_publish')

    let messageReceived = false
    function checkMessage (msg) {
      messageReceived = true
    }

    // connect peers
    await floodsub1._libp2p.dial(floodsub2._libp2p.peerId)

    // subscribe and wait for subscription to be received in the other peer
    floodsub2.subscribe(topic)
    floodsub2.on(topic, checkMessage)
    await pWaitFor(() => {
      const subs = floodsub1.getSubscribers(topic)

      return subs.length === 1
    })

    await floodsub1.publish(topic, message)
    await pWaitFor(() => messageReceived === true)

    expect(floodsub2.seenCache.has.callCount).to.eql(2) // Put also calls .has
    expect(floodsub2.seenCache.put.callCount).to.eql(1)
    expect(floodsub2._publish.callCount).to.eql(1) // Forward message

    const [msgProcessed] = floodsub2._processRpcMessage.getCall(0).args

    // Force a second process for the message
    await floodsub2._processRpcMessage(msgProcessed)

    expect(floodsub2.seenCache.has.callCount).to.eql(3)
    expect(floodsub2.seenCache.put.callCount).to.eql(1) // No new put
    expect(floodsub2._publish.callCount).to.eql(1) // Not forwarded
  })

  it('forwards normalized messages on publish', async () => {
    sinon.spy(floodsub1, '_forwardMessage')
    sinon.spy(utils, 'randomSeqno')

    await floodsub1.publish(topic, message)
    expect(floodsub1._forwardMessage.callCount).to.eql(1)
    const [messageToEmit] = floodsub1._forwardMessage.getCall(0).args

    const expected = utils.normalizeInRpcMessage(
      await floodsub1._buildMessage({
        receivedFrom: peer1.peerId.toB58String(),
        from: peer1.peerId.toB58String(),
        data: message,
        seqno: utils.randomSeqno.getCall(0).returnValue,
        topicIDs: [topic]
      }))

    expect(messageToEmit).to.eql(expected)
  })
})
