'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')

const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Multiplex],
        crypto: [SECIO]
      },
      // we add the DHT module that will enable Peer and Content Routing
      DHT: KadDHT
    }
    super(modules, peerInfo)
  }
}

function createNode (callback) {
  let node

  waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      node = new MyBundle(peerInfo)
      node.start(cb)
    }
  ], (err) => callback(err, node))
}

parallel([
  (cb) => createNode(cb),
  (cb) => createNode(cb),
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]
  const node3 = nodes[2]

  parallel([
    (cb) => node1.dial(node2.peerInfo, cb),
    (cb) => node2.dial(node3.peerInfo, cb),
    // Set up of the cons might take time
    (cb) => setTimeout(cb, 300)
  ], (err) => {
    if (err) { throw err }

    const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')

    node1.contentRouting.provide(cid, (err) => {
      if (err) { throw err }

      console.log('Node %s is providing %s', node1.peerInfo.id.toB58String(), cid.toBaseEncodedString())

      node3.contentRouting.findProviders(cid, 5000, (err, providers) => {
        if (err) { throw err }

        console.log('Found provider:', providers[0].id.toB58String())
      })
    })
  })
})
