'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
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
      streamMuxer: [Mplex],
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

  const node2Multiaddr = `${node2.transportManager.getAddrs()[0]}/p2p/${node2.peerId.toB58String()}`
  const { stream } = await node1.dialProtocol(node2Multiaddr, '/a-protocol')

  await pipe(
    ['This information is sent out encrypted to the other peer'],
    stream
  )
})();
