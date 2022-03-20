/* eslint-disable no-console */

import { createLibp2p } from '../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { MulticastDNS } from '@libp2p/mdns'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Noise()
    ],
    peerDiscovery: [
      new MulticastDNS({
        interval: 20e3
      })
    ]
  })

  return node
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  node1.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toString()))
  node2.on('peer:discovery', (peerId) => console.log('Discovered:', peerId.toString()))

  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
