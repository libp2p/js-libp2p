/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const uint8ArrayFromString = require('uint8arrays/from-string')
const Floodsub = require('../src')
const { createPeerId, mockRegistrar } = require('./utils')
const { utils } = require('libp2p-pubsub')

const defOptions = {
  emitSelf: true
}

describe('pubsub', () => {
  let floodsub
  let peerId

  before(async () => {
    expect(Floodsub.multicodec).to.exist()

    peerId = await createPeerId()
    floodsub = new Floodsub(peerId, mockRegistrar, defOptions)
  })

  beforeEach(() => {
    return floodsub.start()
  })

  afterEach(() => {
    sinon.restore()
    return floodsub.stop()
  })

  describe('publish', () => {
    it('should emit non normalized messages', async () => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(utils, 'randomSeqno')

      const topic = 'my-topic'
      const message = uint8ArrayFromString('a neat message')

      await floodsub.publish(topic, message)
      expect(floodsub._emitMessages.callCount).to.eql(1)

      const [topics, messages] = floodsub._emitMessages.getCall(0).args
      expect(topics).to.eql([topic])
      expect(messages).to.eql([{
        from: peerId.toB58String(),
        data: message,
        seqno: utils.randomSeqno.getCall(0).returnValue,
        topicIDs: topics
      }])
    })

    it('should forward normalized messages', async () => {
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(utils, 'randomSeqno')

      const topic = 'my-topic'
      const message = uint8ArrayFromString('a neat message')

      await floodsub.publish(topic, message)
      expect(floodsub._forwardMessages.callCount).to.eql(1)
      const [topics, messages] = floodsub._forwardMessages.getCall(0).args

      const expected = await floodsub._buildMessage({
        from: peerId.toB58String(),
        data: message,
        seqno: utils.randomSeqno.getCall(0).returnValue,
        topicIDs: topics
      })

      expect(topics).to.eql([topic])
      expect(messages).to.eql([
        expected
      ])
    })
  })

  describe('validate', () => {
    it('should drop unsigned messages', () => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(floodsub, 'validate')

      const topic = 'my-topic'
      const rpc = {
        subscriptions: [],
        msgs: [{
          from: peerId.id,
          data: uint8ArrayFromString('an unsigned message'),
          seqno: utils.randomSeqno(),
          topicIDs: [topic]
        }]
      }

      floodsub._onRpc('QmAnotherPeer', rpc)

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(floodsub.validate.callCount).to.eql(1)
          expect(floodsub._emitMessages.called).to.eql(false)
          expect(floodsub._forwardMessages.called).to.eql(false)

          resolve()
        }, 50)
      })
    })

    it('should not drop unsigned messages if strict signing is disabled', () => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(floodsub, 'validate')
      sinon.stub(floodsub, 'strictSigning').value(false)

      const topic = 'my-topic'
      const rpc = {
        subscriptions: [],
        msgs: [{
          from: peerId.id,
          data: uint8ArrayFromString('an unsigned message'),
          seqno: utils.randomSeqno(),
          topicIDs: [topic]
        }]
      }

      floodsub._onRpc('QmAnotherPeer', rpc)

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(floodsub.validate.callCount).to.eql(1)
          expect(floodsub._emitMessages.called).to.eql(true)
          expect(floodsub._forwardMessages.called).to.eql(true)

          resolve()
        }, 50)
      })
    })
  })
})
