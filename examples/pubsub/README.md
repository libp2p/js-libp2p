# @libp2p/example-pubsub <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> An example using libp2p pubsub

## Table of contents <!-- omit in toc -->

- [0. Set up the example](#0-set-up-the-example)
- [1. Setting up a simple PubSub network on top of libp2p](#1-setting-up-a-simple-pubsub-network-on-top-of-libp2p)
- [2. Future work](#2-future-work)
- [License](#license)
- [Contribution](#contribution)

We've seen many interesting use cases appear with this, here are some highlights:

- [Collaborative Text Editing](https://www.youtube.com/watch?v=-kdx8rJd8rQ)
- [IPFS PubSub (using libp2p-floodsub) for IoT](https://www.youtube.com/watch?v=qLpM5pBDGiE).
- [Real Time distributed Applications](https://www.youtube.com/watch?v=vQrbxyDPSXg)

## 0. Set up the example

Before moving into the examples, you should run `npm install` and `npm run build` on the top level `js-libp2p` folder, in order to install all the dependencies needed for this example. In addition, you will need to install the example related dependencies by doing `cd examples && npm install`. Once the install finishes, you should move into the example folder with `cd pubsub`.

## 1. Setting up a simple PubSub network on top of libp2p

For this example, we will use MulticastDNS for automatic Peer Discovery. This example is based the previous examples found in [Discovery Mechanisms](../discovery-mechanisms). You can find the complete version at [1.js](./1.js).

Using PubSub is super simple, you only need to provide the implementation of your choice and you are ready to go. No need for extra configuration.

First, let's update our libp2p configuration with a pubsub implementation.

```JavaScript
import { createLibp2p } from 'libp2p'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [tcp()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()],
    services: {
      // we add the Pubsub module we want
      pubsub: gossipsub({ allowPublishToZeroPeers: true })
    }
  })

  return node
}
```

Once that is done, we only need to create a few libp2p nodes, connect them and everything is ready to start using pubsub.

```JavaScript
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

const topic = 'news'

const [node1, node2] = await Promise.all([
  createNode(),
  createNode()
])

// Add node's 2 data to the PeerStore
await node1.peerStore.patch(node2.peerId, {
  multiaddrs: node2.getMultiaddrs()
})
await node1.dial(node2.peerId)

node1.services.pubsub.addEventListener("message", (evt) => {
  console.log(`node1 received: ${uint8ArrayToString(evt.detail.data)} on topic ${evt.detail.topic}`)
})
await node1.services.pubsub.subscribe(topic)

// Will not receive own published messages by default
node2.services.pubsub.addEventListener("message", (evt) => {
  console.log(`node2 received: ${uint8ArrayToString(evt.detail.data)} on topic ${evt.detail.topic}`)
})
await node2.services.pubsub.subscribe(topic)

// node2 publishes "news" every second
setInterval(() => {
  node2.services.pubsub.publish(topic, uint8ArrayFromString('Bird bird bird, bird is the word!')).catch(err => {
    console.error(err)
  })
}, 1000)
```

The output of the program should look like:

    > node 1.js
    connected to QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82
    node1 received: Bird bird bird, bird is the word!
    node1 received: Bird bird bird, bird is the word!

You can change the pubsub `emitSelf` option if you want the publishing node to receive its own messages.

```JavaScript
gossipsub({ allowPublishToZeroPeers: true, emitSelf: true })
```

The output of the program should look like:

    > node 1.js
    connected to QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82
    node1 received: Bird bird bird, bird is the word!
    node2 received: Bird bird bird, bird is the word!
    node1 received: Bird bird bird, bird is the word!
    node2 received: Bird bird bird, bird is the word!

## 2. Future work

libp2p/IPFS PubSub is enabling a whole set of Distributed Real Time applications using CRDT (Conflict-Free Replicated Data Types). It is still going through heavy research (and hacking) and we invite you to join the conversation at [research-CRDT](https://github.com/ipfs/research-CRDT). Here is a list of some of the exciting examples:

- [PubSub Room](https://github.com/ipfs-labs/ipfs-pubsub-room)
- [Live DB - A always in Sync DB using CRDT](https://github.com/ipfs-labs/ipfs-live-db)
- [IIIF Annotations over IPFS, CRDT and libp2p](https://www.youtube.com/watch?v=hmAniA6g9D0\&feature=youtu.be\&t=10m40s)
- [orbit.chat - p2p chat application, fully running in the browser with js-ipfs, js-libp2p and orbit-db](http://orbit.chat/)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
