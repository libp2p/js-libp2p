/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const libp2pIPFS = require('libp2p-ipfs')
const parallel = require('run-parallel')
const _times = require('lodash.times')
const _values = require('lodash.values')

const PSG = require('../src')

describe('basics', () => {
  let nodeA
  let nodeB
  let psA
  let psB

  before((done) => {
    const idA = PeerId.create()
    const peerA = new PeerInfo(idA)
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    nodeA = new libp2pIPFS.Node(peerA)

    const idB = PeerId.create()
    const peerB = new PeerInfo(idB)
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    nodeB = new libp2pIPFS.Node(peerB)

    parallel([
      nodeA.start,
      nodeB.start
    ], done)
  })

  after((done) => {
    parallel([
      nodeA.stop,
      nodeB.stop
    ], done)
  })

  it('Mount the pubsub protocol', (done) => {
    parallel([
      (cb) => {
        psA = new PSG(nodeA)
        setTimeout(() => {
          expect(psA.getPeerSet()).to.eql({})
          expect(psA.getSubscriptions()).to.eql([])
          cb()
        }, 50)
      },
      (cb) => {
        psB = new PSG(nodeB)
        setTimeout(() => {
          expect(psB.getPeerSet()).to.eql({})
          expect(psB.getSubscriptions()).to.eql([])
          cb()
        }, 50)
      }
    ], done)
  })

  it('Dial from nodeA to nodeB', (done) => {
    nodeA.dialByPeerInfo(nodeB.peerInfo, (err) => {
      expect(err).to.not.exist
      setTimeout(() => {
        expect(Object.keys(psA.getPeerSet()).length).to.equal(1)
        expect(Object.keys(psB.getPeerSet()).length).to.equal(1)
        done()
      }, 250)
    })
  })

  it('Subscribe to a topic:Z in nodeA', (done) => {
    psA.subscribe('Z')
    setTimeout(() => {
      expect(psA.getSubscriptions()).to.eql(['Z'])
      const peersB = _values(psB.getPeerSet())
      expect(peersB.length).to.equal(1)
      expect(peersB[0].topics).to.eql(['Z'])
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
    expect(psA.getSubscriptions()).to.eql([])

    setTimeout(() => {
      const peersB = _values(psB.getPeerSet())
      expect(peersB.length).to.equal(1)
      expect(peersB[0].topics).to.eql([])
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

function shouldNotHappen (msg) {
  expect.fail()
}
