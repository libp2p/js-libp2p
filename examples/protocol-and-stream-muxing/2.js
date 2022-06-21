import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
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
    streamMuxers: [new Mplex()],
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

  node2.handle(['/a', '/b'], ({ protocol, stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(`from: ${protocol}, msg: ${uint8ArrayToString(msg)}`)
        }
      }
    ).finally(() => {
      // clean up resources
      stream.close()
    })
  })

  const stream1 = await node1.dialProtocol(node2.peerId, ['/a'])
  await pipe(
    [uint8ArrayFromString('protocol (a)')],
    stream1
  )

  const stream2 = await node1.dialProtocol(node2.peerId, ['/b'])
  await pipe(
    [uint8ArrayFromString('protocol (b)')],
    stream2
  )

  const stream3 = await node1.dialProtocol(node2.peerId, ['/b'])
  await pipe(
    [uint8ArrayFromString('another stream on protocol (b)')],
    stream3
  )
})();
