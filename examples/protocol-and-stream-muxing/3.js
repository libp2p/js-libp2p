/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Yamux } from '@chainsafe/libp2p-yamux'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [
      new Yamux(),
      new Mplex()
    ],
    connectionEncryption: [new Noise()]
  })

  await node.start()

  return node
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  // Add node's 2 data to the PeerStore
  await node1.peerStore.addressBook.set(node2.peerId, node2.getMultiaddrs())

  node1.handle('/node-1', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(uint8ArrayToString(msg.subarray()))
        }
      }
    )
  })

  node2.handle('/node-2', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(uint8ArrayToString(msg.subarray()))
        }
      }
    )
  })

  const stream1 = await node1.dialProtocol(node2.peerId, ['/node-2'])
  await pipe(
    [uint8ArrayFromString('from 1 to 2')],
    stream1
  )

  const stream2 = await node2.dialProtocol(node1.peerId, ['/node-1'])
  await pipe(
    [uint8ArrayFromString('from 2 to 1')],
    stream2
  )
})();
