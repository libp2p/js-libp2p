/* eslint-disable no-console */
'use strict'

import { createLibp2p } from '../../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Noise } from '@chainsafe/libp2p-noise'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: [
        '/ip4/0.0.0.0/tcp/0'
      ]
    },
    transports: [
      new TCP()
    ],
    connectionEncryption: [
      new Noise()
    ]
  })

  await node.start()
  return node
}

;(async () => {
  const node = await createNode()

  console.log('node has started (true/false):', node.isStarted())
  console.log('listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toString()}`))
})();
