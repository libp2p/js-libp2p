/* eslint-disable no-console */

import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { FloodSub } from '@libp2p/floodsub'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: new FloodSub()
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
  await node1.peerStore.addressBook.set(node2.peerId, node2.getMultiaddrs())
  await node1.dial(node2.peerId)

  node1.pubsub.subscribe(topic)
  node1.pubsub.addEventListener('message', (evt) => {
    console.log(`node1 received: ${uint8ArrayToString(evt.detail.data)} on topic ${evt.detail.topic}`)
  })

  // Will not receive own published messages by default
  node2.pubsub.subscribe(topic)
  node2.pubsub.addEventListener('message', (evt) => {
    console.log(`node2 received: ${uint8ArrayToString(evt.detail.data)} on topic ${evt.detail.topic}`)
  })

  // node2 publishes "news" every second
  setInterval(() => {
    node2.pubsub.publish(topic, uint8ArrayFromString('Bird bird bird, bird is the word!'))
  }, 1000)
})()
