/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const parallel = require('async/parallel')

const MulticastDNS = require('./../src')

describe('MulticastDNS', () => {
  let pA
  let pB
  let pC

  before((done) => {
    parallel([
      (cb) => {
        PeerInfo.create((err, peer) => {
          if (err) { cb(err) }
          pA = peer
          pA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/20001'))
          cb()
        })
      },
      (cb) => {
        PeerInfo.create((err, peer) => {
          if (err) { cb(err) }
          pB = peer
          pB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/20002'))
          cb()
        })
      },
      (cb) => {
        PeerInfo.create((err, peer) => {
          if (err) { cb(err) }
          pC = peer
          pC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/20003'))
          pC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/30003/ws'))
          cb()
        })
      }
    ], done)
  })

  it('find another peer', (done) => {
    const options = {
      port: 50001   // port must be the same
    }
    const mdnsA = new MulticastDNS(pA, options)
    const mdnsB = new MulticastDNS(pB, options)
    mdnsA.start()
    mdnsB.start()

    mdnsA.once('peer', (peerInfo) => {
      expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
      done()
    })

    mdnsB.once('peer', (peerInfo) => {})
  })

  it('only announce TCP multiaddrs', (done) => {
    const options = {
      port: 50003   // port must be the same
    }
    const mdnsA = new MulticastDNS(pA, options)
    const mdnsC = new MulticastDNS(pC, options)

    mdnsA.start()
    mdnsC.start()

    mdnsA.once('peer', (peerInfo) => {
      expect(pC.id.toB58String()).to.eql(peerInfo.id.toB58String())
      expect(peerInfo.multiaddrs.length).to.equal(1)
      done()
    })

    mdnsC.once('peer', (peerInfo) => {})
  })
})
