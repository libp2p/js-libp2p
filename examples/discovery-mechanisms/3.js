/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')

const createRelayServer = require('libp2p-relay-server')

const createNode = async (bootstrapers) => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      pubsub: Gossipsub,
      peerDiscovery: [Bootstrap, PubsubPeerDiscovery]
    },
    config: {
      peerDiscovery: {
        [PubsubPeerDiscovery.tag]: {
          interval: 1000,
          enabled: true
        },
        [Bootstrap.tag]: {
          enabled: true,
          list: bootstrapers
        }
      }
    }
  })

  return node
}

;(async () => {
  const relay = await createRelayServer({
    listenAddresses: ['/ip4/0.0.0.0/tcp/0']
  })
  console.log(`libp2p relay starting with id: ${relay.peerId.toB58String()}`)
  await relay.start()
  const relayMultiaddrs = relay.multiaddrs.map((m) => `${m.toString()}/p2p/${relay.peerId.toB58String()}`)

  const [node1, node2] = await Promise.all([
    createNode(relayMultiaddrs),
    createNode(relayMultiaddrs)
  ])

  node1.on('peer:discovery', (peerId) => {
    console.log(`Peer ${node1.peerId.toB58String()} discovered: ${peerId.toB58String()}`)
  })
  node2.on('peer:discovery', (peerId) => {
    console.log(`Peer ${node2.peerId.toB58String()} discovered: ${peerId.toB58String()}`)
  })

  ;[node1, node2].forEach((node, index) => console.log(`Node ${index} starting with id: ${node.peerId.toB58String()}`))
  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
