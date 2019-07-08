/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const sinon = require('sinon')
const series = require('async/series')
const parallel = require('async/parallel')

const PubsubBaseProtocol = require('../src')
const { randomSeqno } = require('../src/utils')
const utils = require('./utils')
const createNode = utils.createNode

class PubsubImplementation extends PubsubBaseProtocol {
  constructor (libp2p) {
    super('libp2p:pubsub', 'libp2p:pubsub-implementation', libp2p)
  }

  publish (topics, messages) {
    // ...
  }

  subscribe (topics) {
    // ...
  }

  unsubscribe (topics) {
    // ...
  }

  _processConnection (idB58Str, conn, peer) {
    // ...
  }
}

describe('pubsub base protocol', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('fresh nodes', () => {
    let nodeA
    let nodeB
    let psA
    let psB

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

    before('mount the pubsub protocol', (done) => {
      psA = new PubsubImplementation(nodeA)
      psB = new PubsubImplementation(nodeB)

      setTimeout(() => {
        expect(psA.peers.size).to.be.eql(0)
        expect(psB.peers.size).to.be.eql(0)
        done()
      }, 50)
    })

    before('start both Pubsub', (done) => {
      parallel([
        (cb) => psA.start(cb),
        (cb) => psB.start(cb)
      ], done)
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb)
      ], done)
    })

    it('Dial from nodeA to nodeB', (done) => {
      series([
        (cb) => nodeA.dial(nodeB.peerInfo, cb),
        (cb) => setTimeout(() => {
          expect(psA.peers.size).to.equal(1)
          expect(psB.peers.size).to.equal(1)
          cb()
        }, 1000)
      ], done)
    })

    it('_buildMessage normalizes and signs messages', (done) => {
      const message = {
        from: psA.peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      psA._buildMessage(message, (err, signedMessage) => {
        expect(err).to.not.exist()

        psA.validate(signedMessage, (err, verified) => {
          expect(verified).to.eql(true)
          done(err)
        })
      })
    })

    it('validate with strict signing off will validate a present signature', (done) => {
      const message = {
        from: psA.peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      sinon.stub(psA, 'strictSigning').value(false)

      psA._buildMessage(message, (err, signedMessage) => {
        expect(err).to.not.exist()

        psA.validate(signedMessage, (err, verified) => {
          expect(verified).to.eql(true)
          done(err)
        })
      })
    })

    it('validate with strict signing requires a signature', (done) => {
      const message = {
        from: psA.peerId.id,
        data: 'hello',
        seqno: randomSeqno(),
        topicIDs: ['test-topic']
      }

      psA.validate(message, (err, verified) => {
        expect(verified).to.eql(false)
        done(err)
      })
    })
  })

  describe('dial the pubsub protocol on mount', () => {
    let nodeA
    let nodeB
    let psA
    let psB

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

    it('dial on pubsub on mount', (done) => {
      psA = new PubsubImplementation(nodeA)
      psB = new PubsubImplementation(nodeB)

      parallel([
        (cb) => psA.start(cb),
        (cb) => psB.start(cb)
      ], next)

      function next () {
        expect(psA.peers.size).to.equal(1)
        expect(psB.peers.size).to.equal(1)
        done()
      }
    })

    it('stop both pubsubs', (done) => {
      parallel([
        (cb) => psA.stop(cb),
        (cb) => psB.stop(cb)
      ], done)
    })
  })

  describe('prevent concurrent dials', () => {
    let sandbox
    let nodeA
    let nodeB
    let psA
    let psB

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

        psA = new PubsubImplementation(nodeA)
        psB = new PubsubImplementation(nodeB)

        psB.start(done)
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
      sandbox.on(psA, ['_onDial'])

      // When node A starts, it will dial all peers in its peer book, which
      // is just peer B
      psA.start(startComplete)

      // Simulate a connection coming in from peer B at the same time. This
      // causes pubsub to dial peer B
      nodeA.emit('peer:connect', nodeB.peerInfo)

      function startComplete () {
        // Check that only one dial was made
        setTimeout(() => {
          expect(psA._onDial).to.have.been.called.once()
          done()
        }, 1000)
      }
    })
  })

  describe('allow dials even after error', () => {
    let sandbox
    let nodeA
    let nodeB
    let psA
    let psB

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

        psA = new PubsubImplementation(nodeA)
        psB = new PubsubImplementation(nodeB)

        psB.start(done)
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
      const dialProtocol = psA.libp2p.dialProtocol.bind(psA.libp2p)
      sandbox.on(psA.libp2p, 'dialProtocol', (peerInfo, multicodec, cb) => {
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
      psA.start(startComplete)

      function startComplete () {
        // Simulate a connection coming in from peer B. This causes pubsub
        // to dial peer B
        nodeA.emit('peer:connect', nodeB.peerInfo)

        // Check that both dials were made
        setTimeout(() => {
          expect(psA.libp2p.dialProtocol).to.have.been.called.twice()
          done()
        }, 1000)
      }
    })
  })

  describe('prevent processing dial after stop', () => {
    let sandbox
    let nodeA
    let nodeB
    let psA
    let psB

    before((done) => {
      sandbox = chai.spy.sandbox()

      series([
        (cb) => createNode(cb),
        (cb) => createNode(cb)
      ], (err, nodes) => {
        if (err) return done(err)

        nodeA = nodes[0]
        nodeB = nodes[1]

        psA = new PubsubImplementation(nodeA)
        psB = new PubsubImplementation(nodeB)

        parallel([
          (cb) => psA.start(cb),
          (cb) => psB.start(cb)
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
      sandbox.on(psA, ['_onDial'])

      // Simulate a connection coming in from peer B at the same time. This
      // causes pubsub to dial peer B
      nodeA.emit('peer:connect', nodeB.peerInfo)

      // Stop pubsub before the dial can complete
      psA.stop(() => {
        // Check that the dial was not processed
        setTimeout(() => {
          expect(psA._onDial).to.not.have.been.called()
          done()
        }, 1000)
      })
    })
  })
})
