/* eslint-disable no-console */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
import { createLibp2p } from 'libp2p'
import bootstrappers from './bootstrappers.js'

(async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()],
    peerDiscovery: [
      bootstrap({
        list: bootstrappers
      })
    ]
  })

  node.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail
    console.log('Connection established to:', peerId.toString()) // Emitted when a peer has been found
  })

  node.addEventListener('peer:discovery', (evt) => {
    const peerInfo = evt.detail

    console.log('Discovered:', peerInfo.id.toString())
  })
})()
