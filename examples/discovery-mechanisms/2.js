/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE, SECIO],
      peerDiscovery: [MulticastDNS]
    },
    config: {
      peerDiscovery: {
        [MulticastDNS.tag]: {
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

  node1.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toB58String()))
  node2.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toB58String()))

  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
