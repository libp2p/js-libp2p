/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const { NOISE } = require('@chainsafe/libp2p-noise')
const MPLEX = require('libp2p-mplex')

const pipe = require('it-pipe')

const createNode = async (transports, addresses = []) => {
  if (!Array.isArray(addresses)) {
    addresses = [addresses]
  }

  const node = await Libp2p.create({
    addresses: {
      listen: addresses
    },
    modules: {
      transport: transports,
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    }
  })

  await node.start()
  return node
}

function printAddrs(node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
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
  const [node1, node2, node3] = await Promise.all([
    createNode([TCP], '/ip4/0.0.0.0/tcp/0'),
    createNode([TCP, WebSockets], ['/ip4/0.0.0.0/tcp/0', '/ip4/127.0.0.1/tcp/10000/ws']),
    createNode([WebSockets], '/ip4/127.0.0.1/tcp/20000/ws')
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')
  printAddrs(node3, '3')

  node1.handle('/print', print)
  node2.handle('/print', print)
  node3.handle('/print', print)

  node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)
  node3.peerStore.addressBook.set(node1.peerId, node1.multiaddrs)

  // node 1 (TCP) dials to node 2 (TCP+WebSockets)
  const { stream } = await node1.dialProtocol(node2.peerId, '/print')
  await pipe(
    ['node 1 dialed to node 2 successfully'],
    stream
  )

  // node 2 (TCP+WebSockets) dials to node 2 (WebSockets)
  const { stream: stream2 } = await node2.dialProtocol(node3.peerId, '/print')
  await pipe(
    ['node 2 dialed to node 3 successfully'],
    stream2
  )

  // node 3 (listening WebSockets) can dial node 1 (TCP)
  try {
    await node3.dialProtocol(node1.peerId, '/print')
  } catch (/** @type {any} */ err) {
    console.log('node 3 failed to dial to node 1 with:', err.message)
  }
})();
