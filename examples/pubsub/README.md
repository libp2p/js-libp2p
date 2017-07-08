# Publish Subscribe

Publish Subscribe is something out of scope for the modular networking stack that is libp2p, however, it is something that is enabled through the primitives that libp2p offers and so it has become one of the most interesting use cases for libp2p.

Currently, we have a PubSub implementation, [libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub) and many more being researched at [research-pubsub](https://github.com/libp2p/research-pubsub).

We've seen many interesting use cases appear with this, here are some highlights:

- [Collaborative Text Editing](https://www.youtube.com/watch?v=-kdx8rJd8rQ)
- [IPFS PubSub (using libp2p-floodsub) for IoT](https://www.youtube.com/watch?v=qLpM5pBDGiE).
- [Real Time distributed Applications](https://www.youtube.com/watch?v=vQrbxyDPSXg)

## 1. Setting up a simple PubSub network on top of libp2p

For this example, we will use MulticastDNS for automatic Peer Discovery and libp2p-floodsub to give us the PubSub primitives we are looking for. This example is based the previous examples found in [Discovery Mechanisms](../discovery-mechanisms). You can find the complete version at [1.js](./1.js).

Getting PubSub is super simple, all you have to do is require the FloodSub module and pass it in a libp2p node, once you have done that you can start subscribing and publishing in any topic.

```JavaScript
const FloodSub = require('libp2p-floodsub')

const fs1 = new FloodSub(node1)
const fs2 = new FloodSub(node2)

series([
  (cb) => fs1.start(cb),
  (cb) => fs2.start(cb),
  (cb) => node1.once('peer:discovery', (peer) => node1.dial(peer, cb)),
  (cb) => setTimeout(cb, 500)
], (err) => {
  if (err) { throw err }

  fs2.on('news', (msg) => console.log(msg.from, msg.data.toString()))
  fs2.subscribe('news')

  setInterval(() => {
    fs1.publish('news', Buffer.from('Bird bird bird, bird is the word!'))
  }, 1000)
})
```

The output of the program should look like:

```
> node 1.js
QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82 Bird bird bird, bird is the word!
QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82 Bird bird bird, bird is the word!
QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82 Bird bird bird, bird is the word!
QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82 Bird bird bird, bird is the word!
QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82 Bird bird bird, bird is the word!
```

## 2. Future work

libp2p/IPFS PubSub is enabling a whole set of Distributed Real Time applications using CRDT (Conflict-Free Replicated Data Types). It is still going through heavy research (and hacking) and we invite you to join the conversation at [research-CRDT](https://github.com/ipfs/research-CRDT). Here is a list of some of the exciting examples:

- [PubSub Room](https://github.com/ipfs-labs/ipfs-pubsub-room)
- [Live DB - A always in Sync DB using CRDT](https://github.com/ipfs-labs/ipfs-live-db)
- [IIIF Annotations over IPFS, CRDT and libp2p](https://www.youtube.com/watch?v=hmAniA6g9D0&feature=youtu.be&t=10m40s)
- [orbit.chat - p2p chat application, fully running in the browser with js-ipfs, js-libp2p and orbit-db](http://orbit.chat/)
