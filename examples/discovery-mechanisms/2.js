/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Yamux } from '@chainsafe/libp2p-yamux'
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
      new Yamux(),
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

  node1.addEventListener('peer:discovery', (evt) => console.log('Discovered:', evt.detail.id.toString()))
  node2.addEventListener('peer:discovery', (evt) => console.log('Discovered:', evt.detail.id.toString()))

  await Promise.all([
    node1.start(),
    node2.start()
  ])
})();
