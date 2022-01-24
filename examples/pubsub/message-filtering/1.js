/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('@chainsafe/libp2p-noise')
const Gossipsub = require('@achingbrain/libp2p-gossipsub')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      pubsub: Gossipsub
    }
  })

  await node.start()
  return node
}

(async () => {
  const topic = 'fruit'

  const [node1, node2, node3] = await Promise.all([
    createNode(),
    createNode(),
    createNode(),
  ])

  // node1 conect to node2 and node2 conect to node3
  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node1.dial(node2.peerId)

  await node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)
  await node2.dial(node3.peerId)

  //subscribe
  node1.pubsub.on(topic, (msg) => {
    // Will not receive own published messages by default
    console.log(`node1 received: ${uint8ArrayToString(msg.data)}`)
  })
  await node1.pubsub.subscribe(topic)

  node2.pubsub.on(topic, (msg) => {
    console.log(`node2 received: ${uint8ArrayToString(msg.data)}`)
  })
  await node2.pubsub.subscribe(topic)

  node3.pubsub.on(topic, (msg) => {
    console.log(`node3 received: ${uint8ArrayToString(msg.data)}`)
  })
  await node3.pubsub.subscribe(topic)

  const validateFruit = (msgTopic, msg) => {
    const fruit = uint8ArrayToString(msg.data)
    const validFruit = ['banana', 'apple', 'orange']

    if (!validFruit.includes(fruit)) {
      throw new Error('no valid fruit received')
    }
  }

  //validate fruit
  node1.pubsub.topicValidators.set(topic, validateFruit)
  node2.pubsub.topicValidators.set(topic, validateFruit)
  node3.pubsub.topicValidators.set(topic, validateFruit)

  // node1 publishes "fruits" every five seconds
  var count = 0;
  const myFruits = ['banana', 'apple', 'car', 'orange'];
  // car is not a fruit !
  setInterval(() => {
    console.log('############## fruit ' + myFruits[count] + ' ##############')
    node1.pubsub.publish(topic, uint8ArrayFromString(myFruits[count]))
    count++
    if (count == myFruits.length) {
      count = 0
    }
  }, 5000)
})()
