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

  // exact matching
  node2.handle('/your-protocol', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })

  // multiple protocols
  /*
  node2.handle(['/another-protocol/1.0.0', '/another-protocol/2.0.0'], ({ protocol, stream }) => {
    if (protocol === '/another-protocol/2.0.0') {
      // handle backwards compatibility
    }

    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })
  */

  const { stream } = await node1.dialProtocol(node2.peerId, ['/your-protocol'])
  await pipe(
    ['my own protocol, wow!'],
    stream
  )

  /*
  const { stream } = node1.dialProtocol(node2.peerId, ['/another-protocol/1.0.0'])

  await pipe(
    ['my own protocol, wow!'],
    stream
  )
  */
})();
