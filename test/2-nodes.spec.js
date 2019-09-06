/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
const times = require('lodash/times')

const FloodSub = require('../src')
const utils = require('./utils')
const first = utils.first
const createNode = utils.createNode
const expectSet = utils.expectSet

describe('basics between 2 nodes', () => {
  describe('fresh nodes', () => {
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
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
      fsA = new FloodSub(nodeA, { emitSelf: true })
      fsB = new FloodSub(nodeB, { emitSelf: true })

      setTimeout(() => {
        expect(fsA.peers.size).to.be.eql(0)
        expect(fsA.subscriptions.size).to.eql(0)
        expect(fsB.peers.size).to.be.eql(0)
        expect(fsB.subscriptions.size).to.eql(0)
        done()
      }, 50)
    })

    it('start both FloodSubs', (done) => {
      parallel([
        (cb) => fsA.start(cb),
        (cb) => fsB.start(cb)
      ], done)
    })

    it('Dial from nodeA to nodeB', (done) => {
      series([
        (cb) => nodeA.dial(nodeB.peerInfo, cb),
        (cb) => setTimeout(() => {
          expect(fsA.peers.size).to.equal(1)
          expect(fsB.peers.size).to.equal(1)
          cb()
        }, 1000)
      ], done)
    })

    it('Subscribe to a topic:Z in nodeA', (done) => {
      fsA.subscribe('Z')
      fsB.once('floodsub:subscription-change', (changedPeerInfo, changedTopics, changedSubs) => {
        expectSet(fsA.subscriptions, ['Z'])
        expect(fsB.peers.size).to.equal(1)
        expectSet(first(fsB.peers).topics, ['Z'])
        expect(changedPeerInfo.id.toB58String()).to.equal(first(fsB.peers).info.id.toB58String())
        expectSet(changedTopics, ['Z'])
        expect(changedSubs).to.be.eql([{ topicID: 'Z', subscribe: true }])
        done()
      })
    })

    it('Publish to a topic:Z in nodeA', (done) => {
      fsA.once('Z', (msg) => {
        expect(msg.data.toString()).to.equal('hey')
        fsB.removeListener('Z', shouldNotHappen)
        done()
      })

      fsB.once('Z', shouldNotHappen)

      fsA.publish('Z', Buffer.from('hey'))
    })

    it('Publish to a topic:Z in nodeB', (done) => {
      fsA.once('Z', (msg) => {
        fsA.once('Z', shouldNotHappen)
        expect(msg.data.toString()).to.equal('banana')

        setTimeout(() => {
          fsA.removeListener('Z', shouldNotHappen)
          fsB.removeListener('Z', shouldNotHappen)
          done()
        }, 100)
      })

      fsB.once('Z', shouldNotHappen)

      fsB.publish('Z', Buffer.from('banana'))
    })

    it('Publish 10 msg to a topic:Z in nodeB', (done) => {
      let counter = 0

      fsB.once('Z', shouldNotHappen)

      fsA.on('Z', receivedMsg)

      function receivedMsg (msg) {
        expect(msg.data.toString()).to.equal('banana')
        expect(msg.from).to.be.eql(fsB.libp2p.peerInfo.id.toB58String())
        expect(Buffer.isBuffer(msg.seqno)).to.be.true()
        expect(msg.topicIDs).to.be.eql(['Z'])

        if (++counter === 10) {
          fsA.removeListener('Z', receivedMsg)
          fsB.removeListener('Z', shouldNotHappen)
          done()
        }
      }

      times(10, () => fsB.publish('Z', Buffer.from('banana')))
    })

    it('Publish 10 msg to a topic:Z in nodeB as array', (done) => {
      let counter = 0

      fsB.once('Z', shouldNotHappen)

      fsA.on('Z', receivedMsg)

      function receivedMsg (msg) {
        expect(msg.data.toString()).to.equal('banana')
        expect(msg.from).to.be.eql(fsB.libp2p.peerInfo.id.toB58String())
        expect(Buffer.isBuffer(msg.seqno)).to.be.true()
        expect(msg.topicIDs).to.be.eql(['Z'])

        if (++counter === 10) {
          fsA.removeListener('Z', receivedMsg)
          fsB.removeListener('Z', shouldNotHappen)
          done()
        }
      }

      let msgs = []
      times(10, () => msgs.push(Buffer.from('banana')))
      fsB.publish('Z', msgs)
    })

    it('Unsubscribe from topic:Z in nodeA', (done) => {
      fsA.unsubscribe('Z')
      expect(fsA.subscriptions.size).to.equal(0)

      fsB.once('floodsub:subscription-change', (changedPeerInfo, changedTopics, changedSubs) => {
        expect(fsB.peers.size).to.equal(1)
        expectSet(first(fsB.peers).topics, [])
        expect(changedPeerInfo.id.toB58String()).to.equal(first(fsB.peers).info.id.toB58String())
        expectSet(changedTopics, [])
        expect(changedSubs).to.be.eql([{ topicID: 'Z', subscribe: false }])
        done()
      })
    })

    it('Publish to a topic:Z in nodeA nodeB', (done) => {
      fsA.once('Z', shouldNotHappen)
      fsB.once('Z', shouldNotHappen)

      setTimeout(() => {
        fsA.removeListener('Z', shouldNotHappen)
        fsB.removeListener('Z', shouldNotHappen)
        done()
      }, 100)

      fsB.publish('Z', Buffer.from('banana'))
      fsA.publish('Z', Buffer.from('banana'))
    })

    it('stop both FloodSubs', (done) => {
      parallel([
        (cb) => fsA.stop(cb),
        (cb) => fsB.stop(cb)
      ], done)
    })
  })

  describe('nodes send state on connection', () => {
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      parallel([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, nodes) => {
        expect(err).to.not.exist()

        nodeA = nodes[0]
        nodeB = nodes[1]

        fsA = new FloodSub(nodeA)
        fsB = new FloodSub(nodeB)

        parallel([
          (cb) => fsA.start(cb),
          (cb) => fsB.start(cb)
        ], next)

        function next () {
          fsA.subscribe('Za')
          fsB.subscribe('Zb')

          expect(fsA.peers.size).to.equal(0)
          expectSet(fsA.subscriptions, ['Za'])
          expect(fsB.peers.size).to.equal(0)
          expectSet(fsB.subscriptions, ['Zb'])
          done()
        }
      })
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('existing subscriptions are sent upon peer connection', (done) => {
      parallel([
        cb => fsA.once('floodsub:subscription-change', () => cb()),
        cb => fsB.once('floodsub:subscription-change', () => cb())
      ], () => {
        expect(fsA.peers.size).to.equal(1)
        expect(fsB.peers.size).to.equal(1)

        expectSet(fsA.subscriptions, ['Za'])
        expect(fsB.peers.size).to.equal(1)
        expectSet(first(fsB.peers).topics, ['Za'])

        expectSet(fsB.subscriptions, ['Zb'])
        expect(fsA.peers.size).to.equal(1)
        expectSet(first(fsA.peers).topics, ['Zb'])

        done()
      })

      nodeA.dial(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist()
      })
    })

    it('stop both FloodSubs', (done) => {
      parallel([
        (cb) => fsA.stop(cb),
        (cb) => fsB.stop(cb)
      ], done)
    })
  })

  describe('nodes handle connection errors', () => {
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (cb, nodes) => {
        nodeA = nodes[0]
        nodeB = nodes[1]

        fsA = new FloodSub(nodeA)
        fsB = new FloodSub(nodeB)

        parallel([
          (cb) => fsA.start(cb),
          (cb) => fsB.start(cb)
        ], next)

        function next () {
          fsA.subscribe('Za')
          fsB.subscribe('Zb')

          expect(fsA.peers.size).to.equal(0)
          expectSet(fsA.subscriptions, ['Za'])
          expect(fsB.peers.size).to.equal(0)
          expectSet(fsB.subscriptions, ['Zb'])
          done()
        }
      })
    })

    // TODO understand why this test is failing
    it.skip('peer is removed from the state when connection ends', (done) => {
      nodeA.dial(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist()
        setTimeout(() => {
          expect(first(fsA.peers)._references).to.equal(2)
          expect(first(fsB.peers)._references).to.equal(2)

          fsA.stop(() => setTimeout(() => {
            expect(first(fsB.peers)._references).to.equal(1)
            done()
          }, 1000))
        }, 1000)
      })
    })

    it('stop one node', (done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('nodes don\'t have peers in it', (done) => {
      setTimeout(() => {
        expect(fsA.peers.size).to.equal(0)
        expect(fsB.peers.size).to.equal(0)
        done()
      }, 1000)
    })
  })

  describe('dial the pubsub protocol on mount', () => {
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (cb, nodes) => {
        nodeA = nodes[0]
        nodeB = nodes[1]
        nodeA.dial(nodeB.peerInfo, () => setTimeout(done, 1000))
      })
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('dial on floodsub on mount', (done) => {
      fsA = new FloodSub(nodeA, { emitSelf: true })
      fsB = new FloodSub(nodeB, { emitSelf: true })

      parallel([
        (cb) => fsA.start(cb),
        (cb) => fsB.start(cb)
      ], next)

      function next () {
        expect(fsA.peers.size).to.equal(1)
        expect(fsB.peers.size).to.equal(1)
        done()
      }
    })

    it('stop both FloodSubs', (done) => {
      parallel([
        (cb) => fsA.stop(cb),
        (cb) => fsB.stop(cb)
      ], done)
    })
  })

  describe('prevent concurrent dials', () => {
    let sandbox
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      sandbox = chai.spy.sandbox()

      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, nodes) => {
        if (err) return done(err)

        nodeA = nodes[0]
        nodeB = nodes[1]

        // Put node B in node A's peer book
        nodeA.peerBook.put(nodeB.peerInfo)

        fsA = new FloodSub(nodeA)
        fsB = new FloodSub(nodeB)

        fsB.start(done)
      })
    })

    after((done) => {
      sandbox.restore()

      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], (ignoreErr) => {
        done()
      })
    })

    it('does not dial twice to same peer', (done) => {
      sandbox.on(fsA, ['_onDial'])

      // When node A starts, it will dial all peers in its peer book, which
      // is just peer B
      fsA.start(startComplete)

      // Simulate a connection coming in from peer B at the same time. This
      // causes floodsub to dial peer B
      nodeA.emit('peer:connect', nodeB.peerInfo)

      function startComplete () {
        // Check that only one dial was made
        setTimeout(() => {
          expect(fsA._onDial).to.have.been.called.once()
          done()
        }, 1000)
      }
    })
  })

  describe('allow dials even after error', () => {
    let sandbox
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      sandbox = chai.spy.sandbox()

      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, nodes) => {
        if (err) return done(err)

        nodeA = nodes[0]
        nodeB = nodes[1]

        // Put node B in node A's peer book
        nodeA.peerBook.put(nodeB.peerInfo)

        fsA = new FloodSub(nodeA)
        fsB = new FloodSub(nodeB)

        fsB.start(done)
      })
    })

    after((done) => {
      sandbox.restore()

      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], (ignoreErr) => {
        done()
      })
    })

    it('can dial again after error', (done) => {
      let firstTime = true
      const dialProtocol = fsA.libp2p.dialProtocol.bind(fsA.libp2p)
      sandbox.on(fsA.libp2p, 'dialProtocol', (peerInfo, multicodec, cb) => {
        // Return an error for the first dial
        if (firstTime) {
          firstTime = false
          return cb(new Error('dial error'))
        }

        // Subsequent dials proceed as normal
        dialProtocol(peerInfo, multicodec, cb)
      })

      // When node A starts, it will dial all peers in its peer book, which
      // is just peer B
      fsA.start(startComplete)

      function startComplete () {
        // Simulate a connection coming in from peer B. This causes floodsub
        // to dial peer B
        nodeA.emit('peer:connect', nodeB.peerInfo)

        // Check that both dials were made
        setTimeout(() => {
          expect(fsA.libp2p.dialProtocol).to.have.been.called.twice()
          done()
        }, 1000)
      }
    })
  })

  describe('prevent processing dial after stop', () => {
    let sandbox
    let nodeA
    let nodeB
    let fsA
    let fsB

    before((done) => {
      sandbox = chai.spy.sandbox()

      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, nodes) => {
        if (err) return done(err)

        nodeA = nodes[0]
        nodeB = nodes[1]

        fsA = new FloodSub(nodeA)
        fsB = new FloodSub(nodeB)

        parallel([
          (cb) => fsA.start(cb),
          (cb) => fsB.start(cb)
        ], done)
      })
    })

    after((done) => {
      sandbox.restore()

      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], (ignoreErr) => {
        done()
      })
    })

    it('does not process dial after stop', (done) => {
      sandbox.on(fsA, ['_onDial'])

      // Simulate a connection coming in from peer B at the same time. This
      // causes floodsub to dial peer B
      nodeA.emit('peer:connect', nodeB.peerInfo)

      // Stop floodsub before the dial can complete
      fsA.stop(() => {
        // Check that the dial was not processed
        setTimeout(() => {
          expect(fsA._onDial).to.not.have.been.called()
          done()
        }, 1000)
      })
    })
  })
})

function shouldNotHappen (msg) {
  expect.fail()
}
