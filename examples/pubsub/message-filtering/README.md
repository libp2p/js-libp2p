# Filter Messages

To prevent undesired data from being propagated on the network, we can apply a filter to Gossipsub. Messages that fail validation in the filter will not be re-shared.

## 1. Setting up a PubSub network with three nodes

First, let's update our libp2p configuration with a pubsub implementation.

```JavaScript
import { createLibp2p } from 'libp2p'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [noise()],
	  // we add the Pubsub module we want
	  pubsub: gossipsub({ allowPublishToZeroPeers: true })
  })

  return node
}
```

Then, create three nodes and connect them together. In this example, we will connect the nodes in series. Node 1 connected with node 2 and node 2 connected with node 3.

```JavaScript
const [node1, node2, node3] = await Promise.all([
  createNode(),
  createNode(),
  createNode(),
])

await node1.peerStore.patch(node2.peerId, {
  multiaddrs: node2.getMultiaddrs()
})
await node1.dial(node2.peerId)

await node2.peerStore.patch(node3.peerId, {
  multiaddrs: node3.getMultiaddrs()
})
await node2.dial(node3.peerId)
```

Now we' can subscribe to the fruit topic and log incoming messages.

```JavaScript
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

const topic = 'fruit'

node1.pubsub.addEventListener('message', (msg) => {
  if (msg.detail.topic !== topic) {
    return
  }

  console.log(`node1 received: ${uint8ArrayToString(msg.data)}`)
})
await node1.pubsub.subscribe(topic)

node2.pubsub.addEventListener('message', (msg) => {
  if (msg.detail.topic !== topic) {
    return
  }

  console.log(`node2 received: ${uint8ArrayToString(msg.data)}`)
})
await node2.pubsub.subscribe(topic)

node3.pubsub.addEventListener('message', (msg) => {
  if (msg.detail.topic !== topic) {
    return
  }

console.log(`node3 received: ${uint8ArrayToString(msg.data)}`)
})
await node3.pubsub.subscribe(topic)
```
Finally, let's define the additional filter in the fruit topic.

```JavaScript
const validateFruit = (msgTopic, msg) => {
  const fruit = uint8ArrayToString(msg.data)
  const validFruit = ['banana', 'apple', 'orange']

  if (!validFruit.includes(fruit)) {
    throw new Error('no valid fruit received')
  }
}

node1.pubsub.topicValidators.set(topic, validateFruit)
node2.pubsub.topicValidators.set(topic, validateFruit)
node3.pubsub.topicValidators.set(topic, validateFruit)
```

In this example, node one has an outdated version of the system, or is a malicious node. When it tries to publish fruit, the messages are re-shared and all the nodes share the message. However, when it tries to publish a vehicle the message is not re-shared.

```JavaScript
for (const fruit of ['banana', 'apple', 'car', 'orange']) {
  console.log('############## fruit ' + fruit + ' ##############')
  await node1.pubsub.publish(topic, uint8ArrayFromString(fruit))
}
```

Result

```
> node 1.js
############## fruit banana ##############
node2 received: banana
node3 received: banana
############## fruit apple ##############
node2 received: apple
node3 received: apple
############## fruit car ##############
############## fruit orange ##############
node1 received: orange
node2 received: orange
node3 received: orange
```
