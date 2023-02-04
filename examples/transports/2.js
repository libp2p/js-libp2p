/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { pipe } from 'it-pipe'
import toBuffer from 'it-to-buffer'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex(), yamux()]
  })

  return node
}

function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.getMultiaddrs().forEach((ma) => console.log(ma.toString()))
}

(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')

  node2.handle('/print', async ({ stream }) => {
    const result = await pipe(
      stream,
      async function * (source) {
        for await (const list of source) {
          yield list.subarray()
        }
      },
      toBuffer
    )
    console.log(uint8ArrayToString(result))
  })

  await node1.peerStore.addressBook.set(node2.peerId, node2.getMultiaddrs())
  const stream = await node1.dialProtocol(node2.peerId, '/print')

  await pipe(
    ['Hello', ' ', 'p2p', ' ', 'world', '!'].map(str => uint8ArrayFromString(str)),
    stream
  )
})()
