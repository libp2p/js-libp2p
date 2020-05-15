'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const SECIO = require('libp2p-secio')

const pipe = require('it-pipe')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE, SECIO]
    }
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
  node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)

  node2.handle(['/a', '/b'], ({ protocol, stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(`from: ${protocol}, msg: ${msg.toString()}`)
        }
      }
    )
  })

  const { stream: stream1 } = await node1.dialProtocol(node2.peerId, ['/a'])
  await pipe(
    ['protocol (a)'],
    stream1
  )

  const { stream: stream2 } = await node1.dialProtocol(node2.peerId, ['/b'])
  await pipe(
    ['protocol (b)'],
    stream2
  )

  const { stream: stream3 } = await node1.dialProtocol(node2.peerId, ['/b'])
  await pipe(
    ['another stream on protocol (b)'],
    stream3
  )
})();
