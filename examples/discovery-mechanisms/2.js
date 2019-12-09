/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const MulticastDNS = require('libp2p-mdns')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = Libp2p.create({
    peerInfo,
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
