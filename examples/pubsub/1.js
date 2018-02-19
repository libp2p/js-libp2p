'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const MulticastDNS = require('libp2p-mdns')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const series = require('async/series')

class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Mplex],
        crypto: [SECIO]
      },
      discovery: [
        new MulticastDNS(peerInfo, { interval: 2000 })
      ]
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

  series([
    (cb) => node1.once('peer:discovery', (peer) => node1.dial(peer, cb)),
    (cb) => setTimeout(cb, 500)
  ], (err) => {
    if (err) { throw err }

    node1.pubsub.subscribe('news',
      (msg) => console.log(msg.from, msg.data.toString()),
      () => {
        setInterval(() => {
          node2.pubsub.publish('news', Buffer.from('Bird bird bird, bird is the word!'))
        }, 1000)
      }
    )
  })
})
