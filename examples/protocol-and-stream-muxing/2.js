'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')

const pipe = require('it-pipe')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      streamMuxer: [MPLEX],
      connEncryption: [SECIO]
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

  const { stream: stream1 } = await node1.dialProtocol(node2.peerInfo, ['/a'])
  await pipe(
    ['protocol (a)'],
    stream1
  )

  const { stream: stream2 } = await node1.dialProtocol(node2.peerInfo, ['/b'])
  await pipe(
    ['protocol (b)'],
    stream2
  )

  const { stream: stream3 } = await node1.dialProtocol(node2.peerInfo, ['/b'])
  await pipe(
    ['another stream on protocol (b)'],
    stream3
  )
})();
