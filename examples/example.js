'use strict'

/*
 * Spawn a js-ipfs or a go-ipfs daemon and run this example to
 * watch it being detected
 */

const PeerInfo = require('peer-info')
const MulticastDNS = require('./../src')
const multiaddr = require('multiaddr')
const Node = require('libp2p-ipfs-nodejs')
const series = require('async/series')

const ma = multiaddr('/ip4/127.0.0.1/tcp/0')
let pi
let node

series([
  (cb) => {
    PeerInfo.create((err, peerInfo) => {
      if (err) { cb(err) }
      pi = peerInfo
      pi.multiaddr.add(ma)
      cb()
    })
  },
  (cb) => {
    node = new Node(pi)
    node.start(cb)
  }
], (err) => {
  if (err) {
    throw err
  }
  const options = {
    verify: false,
    port: 5353
  }
  const mdns = new MulticastDNS(node, options)

  console.log('PeerId:', pi.id.toB58String())
  console.log('Looking for other nodes')

  mdns.once('peer', (peerInfo) => {
    console.log(peerInfo.id.toB58String())
  })
})
