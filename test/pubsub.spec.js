/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const sinon = require('sinon')

const Floodsub = require('../src')
const { createNode } = require('./utils')
const { utils } = require('libp2p-pubsub')

describe('pubsub', () => {
  let floodsub
  let libp2p

  before((done) => {
    createNode('/ip4/127.0.0.1/tcp/0', (err, node) => {
      expect(err).to.not.exist()
      libp2p = node
      floodsub = new Floodsub(libp2p)
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
})
