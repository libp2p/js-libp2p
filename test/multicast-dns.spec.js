/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const parallel = require('async/parallel')
const series = require('async/series')
const Node = require('libp2p-ipfs-nodejs')

const MulticastDNS = require('./../src')

describe('MulticastDNS', () => {
  let pA
  let pB
  let pC
  let nodeA
  let nodeB
  let nodeC

  before((done) => {
    series([
      (cb) => {
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
        ], cb)
      },
      (cb) => {
        parallel([
          (cb) => {
            nodeA = new Node(pA)
            nodeA.start(cb)
          },
          (cb) => {
            nodeB = new Node(pB)
            nodeB.start(cb)
          },
          (cb) => {
            nodeC = new Node(pC)
            nodeC.start(cb)
          }
        ], cb)
      }
    ], done)
  })

  it('verify: off', (done) => {
    const options = {
      verify: false,
      port: 50001   // port must be the same
    }
    const mdnsA = new MulticastDNS(nodeA, options)
    const mdnsB = new MulticastDNS(nodeB, options)

    mdnsA.once('peer', (peerInfo) => {
      expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
      done()
    })

    mdnsB.once('peer', (peerInfo) => {})
  })

  it('verify: on', (done) => {
    const options = {
      verify: true,
      port: 50002   // port must be the same
    }
    const mdnsA = new MulticastDNS(nodeA, options)
    const mdnsB = new MulticastDNS(nodeB, options)

    mdnsA.once('peer', (peerInfo) => {
      expect(pB.id.toB58String()).to.eql(peerInfo.id.toB58String())
      done()
    })

    mdnsB.once('peer', (peerInfo) => {})
  })

  it('only announce TCP multiaddrs', (done) => {
    const options = {
      verify: false,
      port: 50003   // port must be the same
    }
    const mdnsA = new MulticastDNS(nodeA, options)
    const mdnsC = new MulticastDNS(nodeC, options)

    mdnsA.once('peer', (peerInfo) => {
      expect(pC.id.toB58String()).to.eql(peerInfo.id.toB58String())
      expect(peerInfo.multiaddrs.length).to.equal(1)
      done()
    })

    mdnsC.once('peer', (peerInfo) => {})
  })
})
