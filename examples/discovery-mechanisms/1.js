/* eslint-disable no-console */

import { createLibp2p } from '../../dist/index.js'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { Bootstrap } from '@libp2p/bootstrap'
import bootstrapers from './bootstrappers.js'

;(async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncrypters: [new Noise()],
    peerDiscoverers: [
      new Bootstrap({
        interval: 60e3,
        list: bootstrapers
      })
    ]
  })

  node.connectionManager.on('peer:connect', (connection) => {
    console.log('Connection established to:', connection.remotePeer.toB58String())	// Emitted when a peer has been found
  })

  node.on('peer:discovery', (peerId) => {
    // No need to dial, autoDial is on
    console.log('Discovered:', peerId.toB58String())
  })

  await node.start()
})();
