/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const Peer = require('peer-info')
const TCP = require('libp2p-tcp')
const pull = require('pull-stream')
const PeerBook = require('peer-book')

const utils = require('./utils')
const Swarm = require('../src')

describe('transport - tcp', () => {
  let swarmA
  let swarmB
  let peerA
  let peerB
  let dialPeers

  before((done) => {
    utils.createInfos(5, (err, infos) => {
      if (err) {
        return done(err)
      }
      peerA = infos[0]
      peerB = infos[1]
      dialPeers = infos.slice(2)

      peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9888')
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9999')
      swarmA = new Swarm(peerA, new PeerBook())
      swarmB = new Swarm(peerB, new PeerBook())
      done()
    })
  })

  let peer
  beforeEach((done) => {
    Peer.create((err, info) => {
      if (err) {
        return done(err)
      }

      peer = info
      done()
    })
  })

  it('.transport.add', (done) => {
    swarmA.transport.add('tcp', new TCP())
    expect(Object.keys(swarmA.transports).length).to.equal(1)

    swarmB.transport.add('tcp', new TCP(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('.transport.listen', (done) => {
    let count = 0
    swarmA.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)
    swarmB.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)

    function ready () {
      if (++count === 2) {
        expect(peerA.multiaddrs.size).to.equal(1)
        expect(peerA.multiaddrs.has('/ip4/127.0.0.1/tcp/9888')).to.equal(true)

        expect(peerB.multiaddrs.size).to.equal(1)
        expect(peerB.multiaddrs.has('/ip4/127.0.0.1/tcp/9999')).to.equal(true)
        done()
      }
    }
  })

  it('.transport.dial to a multiaddr', (done) => {
    dialPeers[0].multiaddrs.add('/ip4/127.0.0.1/tcp/9999')
    const conn = swarmA.transport.dial('tcp', dialPeers[0], (err, conn) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values(['hey']),
      conn,
      pull.onEnd(done)
    )
  })

  it('.transport.dial to set of multiaddr, only one is available', (done) => {
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9910/ws') // not valid on purpose
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9359')
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9329')
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9910')
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9999')
    dialPeers[1].multiaddrs.add('/ip4/127.0.0.1/tcp/9309')

    const conn = swarmA.transport.dial('tcp', dialPeers[1], (err, conn) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values(['hey']),
      conn,
      pull.onEnd(done)
    )
  })

  it('.transport.dial to set of multiaddr, none is available', (done) => {
    dialPeers[2].multiaddrs.add('/ip4/127.0.0.1/tcp/9910/ws') // not valid on purpose
    dialPeers[2].multiaddrs.add('/ip4/127.0.0.1/tcp/9359')
    dialPeers[2].multiaddrs.add('/ip4/127.0.0.1/tcp/9329')

    swarmA.transport.dial('tcp', dialPeers[2], (err, conn) => {
      expect(err).to.exist()
      expect(err.errors).to.have.length(2)
      expect(conn).to.not.exist()
      done()
    })
  })

  it('.close', (done) => {
    parallel([
      (cb) => swarmA.transport.close('tcp', cb),
      (cb) => swarmB.transport.close('tcp', cb)
    ], done)
  }).timeout(2500)

  it('support port 0', (done) => {
    const ma = '/ip4/127.0.0.1/tcp/0'
    let swarm
    peer.multiaddrs.add(ma)

    swarm = new Swarm(peer, new PeerBook())

    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)

    function ready () {
      expect(peer.multiaddrs.size).to.equal(1)
      // should not have /tcp/0 anymore
      expect(peer.multiaddrs.has(ma)).to.equal(false)
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/9050', (done) => {
    const ma = '/ip4/0.0.0.0/tcp/9050'
    let swarm
    peer.multiaddrs.add(ma)
    swarm = new Swarm(peer, new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)

    function ready () {
      expect(peer.multiaddrs.size >= 1).to.equal(true)
      expect(peer.multiaddrs.has(ma)).to.equal(false)
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/0', (done) => {
    const ma = '/ip4/0.0.0.0/tcp/0'
    let swarm
    peer.multiaddrs.add(ma)

    swarm = new Swarm(peer, new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)

    function ready () {
      expect(peer.multiaddrs.size >= 1).to.equal(true)
      expect(peer.multiaddrs.has(ma)).to.equal(false)
      swarm.close(done)
    }
  })

  it('listen in several addrs', (done) => {
    let swarm
    peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9002')
    peer.multiaddrs.add('/ip4/127.0.0.1/tcp/9003')

    swarm = new Swarm(peer, new PeerBook())
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)

    function ready () {
      expect(peer.multiaddrs.size).to.equal(3)
      swarm.close(done)
    }
  })

  it('handles EADDRINUSE error when trying to listen', (done) => {
    const swarm1 = new Swarm(peerA, new PeerBook())
    let swarm2

    swarm1.transport.add('tcp', new TCP())
    swarm1.transport.listen('tcp', {}, (conn) => pull(conn, conn), () => {
      // Add in-use (peerA) address to peerB
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9888')

      swarm2 = new Swarm(peerB, new PeerBook())
      swarm2.transport.add('tcp', new TCP())
      swarm2.transport.listen('tcp', {}, (conn) => pull(conn, conn), ready)
    })

    function ready (err) {
      expect(err).to.exist()
      expect(err.code).to.equal('EADDRINUSE')
      swarm1.close(() => swarm2.close(done))
    }
  })
})
