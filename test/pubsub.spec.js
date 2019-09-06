/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const sinon = require('sinon')
const nextTick = require('async/nextTick')

const Floodsub = require('../src')
const { createNode } = require('./utils')
const { utils } = require('libp2p-pubsub')

describe('pubsub', () => {
  let floodsub
  let libp2p

  before((done) => {
    expect(Floodsub.multicodec).to.exist()

    createNode((err, node) => {
      expect(err).to.not.exist()
      libp2p = node
      floodsub = new Floodsub(libp2p, { emitSelf: true })
      done(err)
    })
  })

  beforeEach(done => {
    floodsub.start(done)
  })

  afterEach(done => {
    sinon.restore()
    floodsub.stop(done)
  })

  describe('publish', () => {
    it('should emit non normalized messages', (done) => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(utils, 'randomSeqno')

      const topic = 'my-topic'
      const message = Buffer.from('a neat message')

      floodsub.publish(topic, message, (err) => {
        expect(err).to.not.exist()
        expect(floodsub._emitMessages.callCount).to.eql(1)

        const [topics, messages] = floodsub._emitMessages.getCall(0).args
        expect(topics).to.eql([topic])
        expect(messages).to.eql([{
          from: libp2p.peerInfo.id.toB58String(),
          data: message,
          seqno: utils.randomSeqno.getCall(0).returnValue,
          topicIDs: topics
        }])
        done()
      })
    })

    it('should forward normalized messages', (done) => {
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(utils, 'randomSeqno')

      const topic = 'my-topic'
      const message = Buffer.from('a neat message')

      floodsub.publish(topic, message, (err) => {
        expect(err).to.not.exist()
        expect(floodsub._forwardMessages.callCount).to.eql(1)
        const [topics, messages] = floodsub._forwardMessages.getCall(0).args

        floodsub._buildMessage({
          from: libp2p.peerInfo.id.toB58String(),
          data: message,
          seqno: utils.randomSeqno.getCall(0).returnValue,
          topicIDs: topics
        }, (err, expected) => {
          expect(err).to.not.exist()

          expect(topics).to.eql([topic])
          expect(messages).to.eql([
            expected
          ])
          done()
        })
      })
    })
  })

  describe('validate', () => {
    it('should drop unsigned messages', (done) => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(floodsub, 'validate')

      const topic = 'my-topic'
      const rpc = {
        subscriptions: [],
        msgs: [{
          from: libp2p.peerInfo.id.id,
          data: Buffer.from('an unsigned message'),
          seqno: utils.randomSeqno(),
          topicIDs: [topic]
        }]
      }

      floodsub._onRpc('QmAnotherPeer', rpc)

      nextTick(() => {
        expect(floodsub.validate.callCount).to.eql(1)
        expect(floodsub._emitMessages.called).to.eql(false)
        expect(floodsub._forwardMessages.called).to.eql(false)

        done()
      })
    })

    it('should not drop unsigned messages if strict signing is disabled', (done) => {
      sinon.spy(floodsub, '_emitMessages')
      sinon.spy(floodsub, '_forwardMessages')
      sinon.spy(floodsub, 'validate')
      sinon.stub(floodsub, 'strictSigning').value(false)

      const topic = 'my-topic'
      const rpc = {
        subscriptions: [],
        msgs: [{
          from: libp2p.peerInfo.id.id,
          data: Buffer.from('an unsigned message'),
          seqno: utils.randomSeqno(),
          topicIDs: [topic]
        }]
      }

      floodsub._onRpc('QmAnotherPeer', rpc)

      nextTick(() => {
        expect(floodsub.validate.callCount).to.eql(1)
        expect(floodsub._emitMessages.called).to.eql(true)
        expect(floodsub._forwardMessages.called).to.eql(true)

        done()
      })
    })
  })
})
