/* eslint-disable no-console */
'use strict'

import { createLibp2p } from '../../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'

import { pipe } from 'it-pipe'
import concat from 'it-concat'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    connectionEncrypters: [new Noise()],
    streamMuxers: [new Mplex()]
  })

  await node.start()
  return node
}

function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')

  node2.handle('/print', async ({ stream }) => {
    const result = await pipe(
      stream,
      concat
    )
    console.log(result.toString())
  })

  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  const { stream } = await node1.dialProtocol(node2.peerId, '/print')

  await pipe(
    ['Hello', ' ', 'p2p', ' ', 'world', '!'],
    stream
  )
})();
