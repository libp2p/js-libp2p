/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const series = require('async/series')
const createNode = require('./utils/create-node')
const sinon = require('sinon')

describe('libp2p creation', () => {
  it('should be able to start and stop successfully', (done) => {
    createNode([], {
      config: {
        EXPERIMENTAL: {
          dht: true,
          pubsub: true
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()

      let sw = node._switch
      let cm = node.connectionManager
      let dht = node._dht
      let pub = node._floodSub

      sinon.spy(sw, 'start')
      sinon.spy(cm, 'start')
      sinon.spy(dht, 'start')
      sinon.spy(dht.randomWalk, 'start')
      sinon.spy(pub, 'start')
      sinon.spy(sw, 'stop')
      sinon.spy(cm, 'stop')
      sinon.spy(dht, 'stop')
      sinon.spy(dht.randomWalk, 'stop')
      sinon.spy(pub, 'stop')
      sinon.spy(node, 'emit')

      series([
        (cb) => node.start(cb),
        (cb) => {
          expect(sw.start.calledOnce).to.equal(true)
          expect(cm.start.calledOnce).to.equal(true)
          expect(dht.start.calledOnce).to.equal(true)
          expect(dht.randomWalk.start.calledOnce).to.equal(true)
          expect(pub.start.calledOnce).to.equal(true)
          expect(node.emit.calledWith('start')).to.equal(true)

          cb()
        },
        (cb) => node.stop(cb)
      ], (err) => {
        expect(err).to.not.exist()

        expect(sw.stop.calledOnce).to.equal(true)
        expect(cm.stop.calledOnce).to.equal(true)
        expect(dht.stop.calledOnce).to.equal(true)
        expect(dht.randomWalk.stop.called).to.equal(true)
        expect(pub.stop.calledOnce).to.equal(true)
        expect(node.emit.calledWith('stop')).to.equal(true)

        done()
      })
    })
  })

  it('should not create disabled modules', (done) => {
    createNode([], {
      config: {
        EXPERIMENTAL: {
          dht: false,
          pubsub: false
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()
      expect(node._dht).to.not.exist()
      expect(node._floodSub).to.not.exist()
      done()
    })
  })
})
