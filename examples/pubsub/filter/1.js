/* eslint-disable no-console */
'use strict'

const { Buffer } = require('buffer')
const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const SECIO = require('libp2p-secio')
const Gossipsub = require('libp2p-gossipsub')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE, SECIO],
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
  node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node1.dial(node2.peerId)

  node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)
  await node2.dial(node3.peerId)

  //subscribe
  await node1.pubsub.subscribe(topic, (msg) => {
    console.log(`node1 received: ${msg.data.toString()}`)
  })

  await node2.pubsub.subscribe(topic, (msg) => {
    console.log(`node2 received: ${msg.data.toString()}`)
  })

  await node3.pubsub.subscribe(topic, (msg) => {
    console.log(`node3 received: ${msg.data.toString()}`)
  })

  const validateFruit = (msgTopic, peer, msg) => {
    const fruit = msg.data.toString();
    const validFruit = ['banana', 'apple', 'orange']
    const valid = validFruit.includes(fruit);
    return valid;
  }

  //validate fruit
  node1.pubsub._pubsub.topicValidators.set(topic, validateFruit);
  node2.pubsub._pubsub.topicValidators.set(topic, validateFruit);
  node3.pubsub._pubsub.topicValidators.set(topic, validateFruit);

  // node1 publishes "fruits" every five seconds
  var count = 0;
  const myFruits = ['banana', 'apple', 'car', 'orange'];
  // car is not a fruit !
  setInterval(() => {
    console.log('############## fruit ' + myFruits[count] + ' ##############')
    node1.pubsub.publish(topic, Buffer.from(myFruits[count]))
    count++
    if (count == myFruits.length) {
      count = 0
    }
  }, 5000)
})()
