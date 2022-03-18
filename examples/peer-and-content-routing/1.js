/* eslint-disable no-console */

import { createLibp2p } from '../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { KadDHT } from '@libp2p/kad-dht'
import delay from 'delay'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncrypters: [new Noise()],
    dht: KadDHT
  })

  await node.start()
  return node
}

;(async () => {
  const [node1, node2, node3] = await Promise.all([
    createNode(),
    createNode(),
    createNode()
  ])

  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)

  await Promise.all([
    node1.dial(node2.peerId),
    node2.dial(node3.peerId)
  ])

  // The DHT routing tables need a moment to populate
  await delay(100)

  const peer = await node1.peerRouting.findPeer(node3.peerId)

  console.log('Found it, multiaddrs are:')
  peer.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${peer.id.toB58String()}`))
})();
