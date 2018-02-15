# Publish Subscribe

Publish Subscribe is also included on the stack. Currently, we have on PubSub implementation which we ship by default [libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub), with many more being researched at [research-pubsub](https://github.com/libp2p/research-pubsub).

We've seen many interesting use cases appear with this, here are some highlights:

- [Collaborative Text Editing](https://www.youtube.com/watch?v=-kdx8rJd8rQ)
- [IPFS PubSub (using libp2p-floodsub) for IoT](https://www.youtube.com/watch?v=qLpM5pBDGiE).
- [Real Time distributed Applications](https://www.youtube.com/watch?v=vQrbxyDPSXg)

## 1. Setting up a simple PubSub network on top of libp2p

For this example, we will use MulticastDNS for automatic Peer Discovery. This example is based the previous examples found in [Discovery Mechanisms](../discovery-mechanisms). You can find the complete version at [1.js](./1.js).

Using PubSub is super simple, all you have to do is start a libp2p node, PubSub will be enabled by default.

```JavaScript
series([
  (cb) => node1.once('peer:discovery', (peer) => node1.dial(peer, cb)),
  (cb) => setTimeout(cb, 500)
], (err) => {
  if (err) { throw err }

  node1.pubsub.on('news', (msg) => console.log(msg.from, msg.data.toString()))
  node1.pubsub.subscribe('news')

  setInterval(() => {
    node2.pubsub.publish('news', Buffer.from('Bird bird bird, bird is the word!'))
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
