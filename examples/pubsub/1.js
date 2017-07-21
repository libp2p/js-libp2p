'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const MulticastDNS = require('libp2p-mdns')
const FloodSub = require('libp2p-floodsub')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const series = require('async/series')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Multiplex],
        crypto: [SECIO]
      },
      discovery: [new MulticastDNS(peerInfo, { interval: 2000 })]
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
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]

  const fs1 = new FloodSub(node1)
  const fs2 = new FloodSub(node2)

  series([
    (cb) => fs1.start(cb),
    (cb) => fs2.start(cb),
    (cb) => node1.once('peer:discovery', (peer) => node1.dial(peer, cb)),
    (cb) => setTimeout(cb, 500)
  ], (err) => {
    if (err) { throw err }

    fs2.on('news', (msg) => console.log(msg.from, msg.data.toString()))
    fs2.subscribe('news')

    setInterval(() => {
      fs1.publish('news', Buffer.from('Bird bird bird, bird is the word!'))
    }, 1000)
  })
})
