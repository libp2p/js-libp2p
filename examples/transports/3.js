/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const SECIO = require('libp2p-secio')
const MPLEX = require('libp2p-mplex')
const PeerInfo = require('peer-info')

const pipe = require('it-pipe')

const createNode = async (peerInfo, transports, multiaddrs = []) => {
  if (!Array.isArray(multiaddrs)) {
    multiaddrs = [multiaddrs]
  }

  multiaddrs.forEach((addr) => peerInfo.multiaddrs.add(addr))

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: transports,
      connEncryption: [SECIO],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()
  return node
}

function printAddrs(node, number) {
  console.log('node %s is listening on:', number)
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
}

function print ({ stream }) {
  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    }
  )
}

;(async () => {
  const [peerInfo1, peerInfo2, peerInfo3] = await Promise.all([
    PeerInfo.create(),
    PeerInfo.create(),
    PeerInfo.create()
  ])
  const [node1, node2, node3] = await Promise.all([
    createNode(peerInfo1, [TCP], '/ip4/0.0.0.0/tcp/0'),
    createNode(peerInfo2, [TCP, WebSockets], ['/ip4/0.0.0.0/tcp/0', '/ip4/127.0.0.1/tcp/10000/ws']),
    createNode(peerInfo3, [WebSockets], '/ip4/127.0.0.1/tcp/20000/ws')
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')
  printAddrs(node3, '3')

  node1.handle('/print', print)
  node2.handle('/print', print)
  node3.handle('/print', print)

  // node 1 (TCP) dials to node 2 (TCP+WebSockets)
  const { stream } = await node1.dialProtocol(node2.peerInfo, '/print')
  await pipe(
    ['node 1 dialed to node 2 successfully'],
    stream
  )

  // node 2 (TCP+WebSockets) dials to node 2 (WebSockets)
  const { stream: stream2 } = await node2.dialProtocol(node3.peerInfo, '/print')
  await pipe(
    ['node 2 dialed to node 3 successfully'],
    stream2
  )

  // node 3 (listening WebSockets) can dial node 1 (TCP)
  try {
    await node3.dialProtocol(node1.peerInfo, '/print')
  } catch (err) {
    console.log('node 3 failed to dial to node 1 with:', err.message)
  }
})();
