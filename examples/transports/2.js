/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const SECIO = require('libp2p-secio')
const MPLEX = require('libp2p-mplex')
const PeerInfo = require('peer-info')

const pipe = require('it-pipe')
const concat = require('it-concat')

const createNode = async (peerInfo) => {
  // To signall the addresses we want to be available, we use
  // the multiaddr format, a self describable address
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      connEncryption: [SECIO],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()
  return node
}

function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
}

;(async () => {
  const [peerInfo1, peerInfo2] = await Promise.all([
    PeerInfo.create(),
    PeerInfo.create()
  ])
  const [node1, node2] = await Promise.all([
    createNode(peerInfo1),
    createNode(peerInfo2)
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

  const { stream } = await node1.dialProtocol(node2.peerInfo, '/print')

  await pipe(
    ['Hello', ' ', 'p2p', ' ', 'world', '!'],
    stream
  )
})();
