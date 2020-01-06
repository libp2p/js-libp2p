/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')

const createNode = async () => {
  const node = await Libp2p.create({
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [SECIO],
      peerDiscovery: [MulticastDNS]
    },
    config: {
      peerDiscovery: {
        mdns: {
          interval: 20e3,
          enabled: true
        }
      }
    }
  })
  node.peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  return node
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  node1.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))
  node2.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))

  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
