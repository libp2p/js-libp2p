/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { CID } from 'multiformats/cid'
import { KadDHT } from '@libp2p/kad-dht'
import all from 'it-all'
import delay from 'delay'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    dht: new KadDHT()
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

  await node1.peerStore.addressBook.set(node2.peerId, node2.getMultiaddrs())
  await node2.peerStore.addressBook.set(node3.peerId, node3.getMultiaddrs())

  await Promise.all([
    node1.dial(node2.peerId),
    node2.dial(node3.peerId)
  ])

  // Wait for onConnect handlers in the DHT
  await delay(100)

  const cid = CID.parse('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
  await node1.contentRouting.provide(cid)

  console.log('Node %s is providing %s', node1.peerId.toString(), cid.toString())

  // wait for propagation
  await delay(300)

  const providers = await all(node3.contentRouting.findProviders(cid, { timeout: 3000 }))

  console.log('Found provider:', providers[0].id.toString())
})();
