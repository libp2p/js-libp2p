/* eslint-disable no-console */

import { createLibp2p } from '../../dist/src/index.js'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import Gossipsub from '@achingbrain/libp2p-gossipsub'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncrypters: [new Noise()],
    pubsub: new Gossipsub()
  })

  await node.start()
  return node
}

;(async () => {
  const topic = 'news'

  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  // Add node's 2 data to the PeerStore
  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node1.dial(node2.peerId)

  node1.pubsub.on(topic, (msg) => {
    console.log(`node1 received: ${uint8ArrayToString(msg.data)}`)
  })
  node1.pubsub.subscribe(topic)

  // Will not receive own published messages by default
  node2.pubsub.on(topic, (msg) => {
    console.log(`node2 received: ${uint8ArrayToString(msg.data)}`)
  })
  node2.pubsub.subscribe(topic)

  // node2 publishes "news" every second
  setInterval(() => {
    node2.pubsub.publish(topic, uint8ArrayFromString('Bird bird bird, bird is the word!'))
  }, 1000)
})()
