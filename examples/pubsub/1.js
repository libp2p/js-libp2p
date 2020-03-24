/* eslint-disable no-console */
'use strict'

const { Buffer } = require('buffer')
const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const Gossipsub = require('libp2p-gossipsub')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [SECIO],
      pubsub: Gossipsub
    }
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

  await node1.dial(node2.peerInfo)

  await node1.pubsub.subscribe(topic, (msg) => {
    console.log(`node1 received: ${msg.data.toString()}`)
  })

  await node2.pubsub.subscribe(topic, (msg) => {
    console.log(`node2 received: ${msg.data.toString()}`)
  })

  // node2 publishes "news" every second
  setInterval(() => {
    node2.pubsub.publish(topic, Buffer.from('Bird bird bird, bird is the word!'))
  }, 1000)
})()
