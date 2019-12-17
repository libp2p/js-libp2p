'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
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
      streamMuxer: [Mplex],
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

  node2.handle('/a-protocol', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })

  const { stream } = await node1.dialProtocol(node2.peerInfo, '/a-protocol')

  await pipe(
    ['This information is sent out encrypted to the other peer'],
    stream
  )
})();
