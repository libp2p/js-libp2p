/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import { mdns } from '@libp2p/mdns'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
      tcp()
    ],
    streamMuxers: [
    yamux(),mplex()
    ],
    connectionEncryption: [
      noise()
    ],
    peerDiscovery: [
      mdns({
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
})()
