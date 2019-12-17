/* eslint-disable no-console */
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
  
  node1.handle('/node-1', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })

  node2.handle('/node-2', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })

  const { stream: stream1 } = await node1.dialProtocol(node2.peerInfo, ['/node-2'])
  await pipe(
    ['from 1 to 2'],
    stream1
  )

  const { stream: stream2 } = await node2.dialProtocol(node1.peerInfo, ['/node-1'])
  await pipe(
    ['from 2 to 1'],
    stream2
  )
})();
