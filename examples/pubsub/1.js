/* eslint-disable no-console */
'use strict'

const libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const MulticastDNS = require('libp2p-mdns')
const Gossipsub = require('libp2p-gossipsub')
const defaultsDeep = require('@nodeutils/defaults-deep')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')

class MyBundle extends libp2p {
  constructor (_options) {
    const defaults = {
      modules: {
        transport: [ TCP ],
        streamMuxer: [ Mplex ],
        connEncryption: [ SECIO ],
        peerDiscovery: [ MulticastDNS ],
        pubsub: Gossipsub
      },
      config: {
        peerDiscovery: {
          mdns: {
            interval: 2000,
            enabled: true
          }
        }
      }
    }

    super(defaultsDeep(_options, defaults))
  }
}

function createNode (callback) {
  let node

  waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
      peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      node = new MyBundle({
        peerInfo
      })
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

  node1.once('peer:connect', (peer) => {
    console.log('connected to %s', peer.id.toB58String())

    // Subscribe to the topic 'news'
    node1.pubsub.subscribe('news',
      (msg) => console.log(msg.from, msg.data.toString()),
      () => {
        setInterval(() => {
          // Publish the message on topic 'news'
          node2.pubsub.publish(
            'news',
            Buffer.from('Bird bird bird, bird is the word!'),
            () => {}
          )
        }, 1000)
      }
    )
  })
})
