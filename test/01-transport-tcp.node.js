/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const TCP = require('libp2p-tcp')
const pull = require('pull-stream')

const utils = require('./utils')
const Swarm = require('../src')

describe('transport - tcp', function () {
  let swarmA
  let swarmB
  let peerA
  let peerB

  before((done) => {
    utils.createInfos(2, (err, infos) => {
      if (err) {
        return done(err)
      }
      peerA = infos[0]
      peerB = infos[1]

      peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888'))
      peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999'))
      swarmA = new Swarm(peerA)
      swarmB = new Swarm(peerB)
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

  it('add', (done) => {
    swarmA.transport.add('tcp', new TCP())
    expect(Object.keys(swarmA.transports).length).to.equal(1)
    swarmB.transport.add('tcp', new TCP(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('listen', (done) => {
    let count = 0
    swarmA.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)
    swarmB.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)

    function ready () {
      if (++count === 2) {
        expect(peerA.multiaddrs.length).to.equal(1)
        expect(
          peerA.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9888'))
        ).to.be.equal(
          true
        )
        expect(peerB.multiaddrs.length).to.equal(1)
        expect(
          peerB.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9999'))
        ).to.be.equal(
          true
        )
        done()
      }
    }
  })

  it('dial to a multiaddr', (done) => {
    const conn = swarmA.transport.dial('tcp', multiaddr('/ip4/127.0.0.1/tcp/9999'), (err, conn) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values(['hey']),
      conn,
      pull.onEnd(done)
    )
  })

  it('dial to set of multiaddr, only one is available', (done) => {
    const conn = swarmA.transport.dial('tcp', [
      multiaddr('/ip4/127.0.0.1/tcp/9910/ws'), // not valid on purpose
      multiaddr('/ip4/127.0.0.1/tcp/9359'),
      multiaddr('/ip4/127.0.0.1/tcp/9329'),
      multiaddr('/ip4/127.0.0.1/tcp/9910'),
      multiaddr('/ip4/127.0.0.1/tcp/9999'),
      multiaddr('/ip4/127.0.0.1/tcp/9309')
    ], (err, conn) => {
      expect(err).to.not.exist()
    })

    pull(
      pull.values(['hey']),
      conn,
      pull.onEnd(done)
    )
  })

  it('dial to set of multiaddr, none is available', (done) => {
    swarmA.transport.dial('tcp', [
      multiaddr('/ip4/127.0.0.1/tcp/9910/ws'), // not valid on purpose
      multiaddr('/ip4/127.0.0.1/tcp/9359'),
      multiaddr('/ip4/127.0.0.1/tcp/9329')
    ], (err, conn) => {
      expect(err).to.exist()
      expect(err.errors).to.have.length(2)
      expect(conn).to.not.exist()
      done()
    })
  })

  it('close', (done) => {
    parallel([
      (cb) => swarmA.transport.close('tcp', cb),
      (cb) => swarmB.transport.close('tcp', cb)
    ], done)
  })

  it('support port 0', (done) => {
    let swarm
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/0'))
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/9050', (done) => {
    let swarm
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/9050'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length >= 1).to.equal(true)
      expect(
        peer.multiaddrs[0].equals(multiaddr('/ip4/127.0.0.1/tcp/9050'))
      ).to.be.equal(
        true
      )
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/0', (done) => {
    let swarm
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length >= 1).to.equal(true)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/0.0.0.0/tcp/0'))
      swarm.close(done)
    }
  })

  it('listen in several addrs', (done) => {
    let swarm
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(3)
      swarm.close(done)
    }
  })

  it('handles EADDRINUSE error when trying to listen', (done) => {
    let swarm1, swarm2
    swarm1 = new Swarm(peerA)
    swarm1.transport.add('tcp', new TCP())
    swarm1.transport.listen('tcp', {}, (conn) => {
      pull(conn, conn)
    }, () => {
      // Add in-use (peerA) address to peerB
      peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888'))
      swarm2 = new Swarm(peerB)
      swarm2.transport.add('tcp', new TCP())
      swarm2.transport.listen('tcp', {}, (conn) => {
        pull(conn, conn)
      }, ready)
    })

    function ready (err) {
      expect(err).to.exist()
      expect(err.code).to.equal('EADDRINUSE')
      swarm1.close(() => swarm2.close(done))
    }
  })
})
