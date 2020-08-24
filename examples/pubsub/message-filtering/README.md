# Filter Messages

To prevent undesired data from being propagated on the network, we can apply a filter to Gossipsub. Messages that fail validation in the filter will not be re-shared.

## 1. Setting up a PubSub network with three nodes

First, let's update our libp2p configuration with a pubsub implementation.

```JavaScript
const Libp2p = require('libp2p')
const Gossipsub = require('libp2p-gossipsub')

const node = await Libp2p.create({
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  },
  modules: {
    transport: [ TCP ],
    streamMuxer: [ Mplex ],
    connEncryption: [ NOISE, SECIO ],
    pubsub: Gossipsub
  }
})
```

Then, create three nodes and connect them together. In this example, we will connect the nodes in series. Node 1 connected with node 2 and node 2 connected with node 3.

```JavaScript
const [node1, node2, node3] = await Promise.all([
  createNode(),
  createNode(),
  createNode(),
])

node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
await node1.dial(node2.peerId)

node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)
await node2.dial(node3.peerId)
```

Now we' can subscribe to the fruit topic and log incoming messages.

```JavaScript
const topic = 'fruit'

await node1.pubsub.subscribe(topic, (msg) => {
  console.log(`node1 received: ${msg.data.toString()}`)
})

await node2.pubsub.subscribe(topic, (msg) => {
  console.log(`node2 received: ${msg.data.toString()}`)
})

await node3.pubsub.subscribe(topic, (msg) => {
  console.log(`node3 received: ${msg.data.toString()}`)
})
```
Finally, let's define the additional filter in the fruit topic.

```JavaScript
const validateFruit = (msgTopic, peer, msg) => {
  const fruit = msg.data.toString();
  const validFruit = ['banana', 'apple', 'orange']
  const valid = validFruit.includes(fruit);
  return valid;
}

node1.pubsub._pubsub.topicValidators.set(topic, validateFruit);
node2.pubsub._pubsub.topicValidators.set(topic, validateFruit);
node3.pubsub._pubsub.topicValidators.set(topic, validateFruit);
```

In this example, node one has an outdated version of the system, or is a malicious node. When it tries to publish fruit, the messages are re-shared and all the nodes share the message. However, when it tries to publish a vehicle the message is not re-shared.

```JavaScript
var count = 0;
const myFruits = ['banana', 'apple', 'car', 'orange'];

setInterval(() => {
  console.log('############## fruit ' + myFruits[count] + ' ##############')
  node1.pubsub.publish(topic, new TextEncoder().encode(myFruits[count]))
  count++
  if (count == myFruits.length) {
    count = 0
  }
}, 5000)
```

Result

```
> node 1.js
############## fruit banana ##############
node1 received: banana
node2 received: banana
node3 received: banana
############## fruit apple ##############
node1 received: apple
node2 received: apple
node3 received: apple
############## fruit car ##############
node1 received: car
############## fruit orange ##############
node1 received: orange
node2 received: orange
node3 received: orange
```