/* eslint-disable no-console */
'use strict'

import { createLibp2p } from '../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { Gossipsub } from '@achingbrain/libp2p-gossipsub'
import { Bootstrap } from '@libp2p/bootstrap'
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'

const createNode = async (bootstrappers) => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: Gossipsub,
    peerDiscovery: [
      new Bootstrap({
        list: bootstrappers
      }),
      new PubSubPeerDiscovery({
        interval: 1000
      })
    ]
  })

  return node
}

;(async () => {
  const relay = await createLibp2p({
    listenAddresses: ['/ip4/0.0.0.0/tcp/0'],
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: Gossipsub,
    peerDiscovery: [
      new PubSubPeerDiscovery({
        interval: 1000
      })
    ],
    relay: {
      enabled: true, // Allows you to dial and accept relayed connections. Does not make you a relay.
      hop: {
        enabled: true // Allows you to be a relay for other peers
      }
    }
  })
  console.log(`libp2p relay starting with id: ${relay.peerId.toString()}`)
  await relay.start()
  const relayMultiaddrs = relay.multiaddrs.map((m) => `${m.toString()}/p2p/${relay.peerId.toString()}`)

  const [node1, node2] = await Promise.all([
    createNode(relayMultiaddrs),
    createNode(relayMultiaddrs)
  ])

  node1.on('peer:discovery', (peerId) => {
    console.log(`Peer ${node1.peerId.toString()} discovered: ${peerId.toString()}`)
  })
  node2.on('peer:discovery', (peerId) => {
    console.log(`Peer ${node2.peerId.toString()} discovered: ${peerId.toString()}`)
  })

  ;[node1, node2].forEach((node, index) => console.log(`Node ${index} starting with id: ${node.peerId.toString()}`))
  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
