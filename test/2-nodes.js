/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const expect = require('chai').expect
const parallel = require('async/parallel')
const series = require('async/series')
const _times = require('lodash.times')

const PSG = require('../src')
const utils = require('./utils')
const first = utils.first
const createNode = utils.createNode
const expectSet = utils.expectSet

describe('basics', () => {
  let nodeA
  let nodeB
  let psA
  let psB

  describe('fresh nodes', () => {
    before((done) => {
      series([
        (cb) => createNode('/ip4/127.0.0.1/tcp/0', cb),
        (cb) => createNode('/ip4/127.0.0.1/tcp/0', cb)
      ], (err, nodes) => {
        if (err) {
          return done(err)
        }
        nodeA = nodes[0]
        nodeB = nodes[1]
        done()
      })
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('Mount the pubsub protocol', (done) => {
      psA = new PSG(nodeA)
      psB = new PSG(nodeB)

      setTimeout(() => {
        expect(psA.peers.size).to.be.eql(0)
        expect(psA.subscriptions.size).to.eql(0)
        expect(psB.peers.size).to.be.eql(0)
        expect(psB.subscriptions.size).to.eql(0)
        done()
      }, 50)
    })

    it('Dial from nodeA to nodeB', (done) => {
      series([
        (cb) => nodeA.dialByPeerInfo(nodeB.peerInfo, cb),
        (cb) => setTimeout(() => {
          expect(psA.peers.size).to.equal(1)
          expect(psB.peers.size).to.equal(1)
          cb()
        }, 250)
      ], done)
    })

    it('Subscribe to a topic:Z in nodeA', (done) => {
      psA.subscribe('Z')
      setTimeout(() => {
        expectSet(psA.subscriptions, ['Z'])
        expect(psB.peers.size).to.equal(1)
        expectSet(first(psB.peers).topics, ['Z'])
        done()
      }, 100)
    })

    it('Publish to a topic:Z in nodeA', (done) => {
      psB.once('Z', shouldNotHappen)

      function shouldNotHappen (msg) { expect.fail() }

      psA.once('Z', (msg) => {
        expect(msg.toString()).to.equal('hey')
        psB.removeListener('Z', shouldNotHappen)
        done()
      })

      psB.once('Z', shouldNotHappen)

      psA.publish('Z', new Buffer('hey'))
    })

    it('Publish to a topic:Z in nodeB', (done) => {
      psB.once('Z', shouldNotHappen)

      psA.once('Z', (msg) => {
        psA.once('Z', shouldNotHappen)
        expect(msg.toString()).to.equal('banana')
        setTimeout(() => {
          psA.removeListener('Z', shouldNotHappen)
          psB.removeListener('Z', shouldNotHappen)
          done()
        }, 100)
      })

      psB.once('Z', shouldNotHappen)

      psB.publish('Z', new Buffer('banana'))
    })

    it('Publish 10 msg to a topic:Z in nodeB', (done) => {
      let counter = 0

      psB.once('Z', shouldNotHappen)

      psA.on('Z', receivedMsg)

      function receivedMsg (msg) {
        expect(msg.toString()).to.equal('banana')

        if (++counter === 10) {
          psA.removeListener('Z', receivedMsg)
          done()
        }
      }

      _times(10, () => {
        psB.publish('Z', new Buffer('banana'))
      })
    })

    it('Unsubscribe from topic:Z in nodeA', (done) => {
      psA.unsubscribe('Z')
      expect(psA.subscriptions.size).to.equal(0)

      setTimeout(() => {
        expect(psB.peers.size).to.equal(1)
        expectSet(first(psB.peers).topics, [])
        done()
      }, 100)
    })

    it('Publish to a topic:Z in nodeA nodeB', (done) => {
      psA.once('Z', shouldNotHappen)
      psB.once('Z', shouldNotHappen)

      setTimeout(() => {
        psA.removeListener('Z', shouldNotHappen)
        psB.removeListener('Z', shouldNotHappen)
        done()
      }, 100)

      psB.publish('Z', new Buffer('banana'))
      psA.publish('Z', new Buffer('banana'))
    })
  })

  describe('long running nodes (already have state)', () => {
    before((done) => {
      series([
        (cb) => createNode('/ip4/127.0.0.1/tcp/0', cb),
        (cb) => createNode('/ip4/127.0.0.1/tcp/0', cb)
      ], (cb, nodes) => {
        nodeA = nodes[0]
        nodeB = nodes[1]

        psA = new PSG(nodeA)
        psB = new PSG(nodeB)

        psA.subscribe('Za')
        psB.subscribe('Zb')

        setTimeout(() => {
          expect(psA.peers.size).to.equal(0)
          expectSet(psA.subscriptions, ['Za'])
          expect(psB.peers.size).to.equal(0)
          expectSet(psB.subscriptions, ['Zb'])

          done()
        }, 50)
      })
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('Existing subscriptions are sent upon peer connection', (done) => {
      nodeA.dialByPeerInfo(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist
        setTimeout(() => {
          expect(psA.peers.size).to.equal(1)
          expect(psB.peers.size).to.equal(1)

          expectSet(psA.subscriptions, ['Za'])
          expect(psB.peers.size).to.equal(1)
          expectSet(first(psB.peers).topics, ['Za'])

          expectSet(psB.subscriptions, ['Zb'])
          expect(psA.peers.size).to.equal(1)
          expectSet(first(psA.peers).topics, ['Zb'])

          done()
        }, 250)
      })
    })
  })
})

function shouldNotHappen (msg) {
  expect.fail()
}
