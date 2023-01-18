/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { bootstrap } from '@libp2p/bootstrap'
import bootstrappers from './bootstrappers.js'

;(async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
    peerDiscovery: [
      bootstrap({
        list: bootstrappers
      })
    ]
  })

  node.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail
    console.log('Connection established to:', peerId.toString())	// Emitted when a peer has been found
  })

  node.addEventListener('peer:discovery', (evt) => {
    const peerInfo = evt.detail

    console.log('Discovered:', peerInfo.id.toString())
  })
})();
