/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const parallel = require('async/parallel')
const series = require('async/series')

const MulticastDNS = require('./../src')

describe('MulticastDNS', () => {
  let pA
  let pB
  let pC
  let pD

  before(function (done) {
    this.timeout(80 * 1000)

    parallel([
      (cb) => {
        PeerInfo.create((err, peer) => {
          expect(err).to.not.exist()

          pA = peer
          pA.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20001'))
          cb()
        })
      },
      (cb) => {
        PeerInfo.create((err, peer) => {
          expect(err).to.not.exist()

          pB = peer
          pB.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20002'))
          pB.multiaddrs.add(multiaddr('/ip6/::1/tcp/20002'))
          cb()
        })
      },
      (cb) => {
        PeerInfo.create((err, peer) => {
          expect(err).to.not.exist()
          pC = peer
          pC.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/20003'))
          pC.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/30003/ws'))
          cb()
        })
      },
      (cb) => {
        PeerInfo.create((err, peer) => {
          if (err) { cb(err) }
          pD = peer
          pD.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/30003/ws'))
          cb()
        })
      }
    ], done)
  })

  it('find another peer', function (done) {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50001
    })

    const mdnsB = new MulticastDNS({
      peerInfo: pB,
      port: 50001 // port must be the same
    })

    parallel([
      (cb) => mdnsA.start(cb),
      (cb) => mdnsB.start(cb)
    ], () => {
      mdnsA.once('peer', (peerInfo) => {
        expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
        parallel([
          (cb) => mdnsA.stop(cb),
          (cb) => mdnsB.stop(cb)
        ], done)
      })

      mdnsB.once('peer', (peerInfo) => {})
    })
  })

  it('only announce TCP multiaddrs', function (done) {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50003
    })
    const mdnsC = new MulticastDNS({
      peerInfo: pC,
      port: 50003 // port must be the same
    })
    const mdnsD = new MulticastDNS({
      peerInfo: pD,
      port: 50003 // port must be the same
    })

    parallel([
      (cb) => mdnsA.start(cb),
      (cb) => mdnsC.start(cb),
      (cb) => mdnsD.start(cb)

    ], () => {
      mdnsA.once('peer', (peerInfo) => {
        expect(pC.id.toB58String()).to.eql(peerInfo.id.toB58String())
        expect(peerInfo.multiaddrs.size).to.equal(1)
        parallel([
          (cb) => mdnsA.stop(cb),
          (cb) => mdnsC.stop(cb),
          (cb) => mdnsD.stop(cb)
        ], done)
      })

      mdnsC.once('peer', (peerInfo) => {})
    })
  })

  it('announces IP6 addresses', function (done) {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      broadcast: false, // do not talk to ourself
      port: 50001
    })

    const mdnsB = new MulticastDNS({
      peerInfo: pB,
      port: 50001
    })

    series([
      (cb) => mdnsB.start(cb),
      (cb) => mdnsA.start(cb)
    ], () => {
      mdnsA.once('peer', (peerInfo) => {
        expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
        expect(peerInfo.multiaddrs.size).to.equal(2)
        parallel([
          (cb) => mdnsA.stop(cb),
          (cb) => mdnsB.stop(cb)
        ], done)
      })

      mdnsB.once('peer', (peerInfo) => {})
    })
  })

  it('doesn\'t emit peers after stop', function (done) {
    this.timeout(40 * 1000)

    const mdnsA = new MulticastDNS({
      peerInfo: pA,
      port: 50004 // port must be the same
    })

    const mdnsC = new MulticastDNS({
      peerInfo: pC,
      port: 50004
    })

    series([
      (cb) => mdnsA.start(cb),
      (cb) => setTimeout(cb, 1000),
      (cb) => mdnsA.stop(cb),
      (cb) => mdnsC.start(cb)
    ], () => {
      setTimeout(() => mdnsC.stop(done), 5000)
      mdnsC.once('peer', (peerInfo) => {
        done(new Error('Should not receive new peer.'))
      })
    })
  })
})
