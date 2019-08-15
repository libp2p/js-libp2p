# Publish Subscribe

Publish Subscribe is also included on the stack. Currently, we have two PubSub implementation available [libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub) and [libp2p-gossipsub](https://github.com/ChainSafe/gossipsub-js), with many more being researched at [research-pubsub](https://github.com/libp2p/research-pubsub).

We've seen many interesting use cases appear with this, here are some highlights:

- [Collaborative Text Editing](https://www.youtube.com/watch?v=-kdx8rJd8rQ)
- [IPFS PubSub (using libp2p-floodsub) for IoT](https://www.youtube.com/watch?v=qLpM5pBDGiE).
- [Real Time distributed Applications](https://www.youtube.com/watch?v=vQrbxyDPSXg)

## 1. Setting up a simple PubSub network on top of libp2p

For this example, we will use MulticastDNS for automatic Peer Discovery. This example is based the previous examples found in [Discovery Mechanisms](../discovery-mechanisms). You can find the complete version at [1.js](./1.js).

Using PubSub is super simple, you only need to provide the implementation of your choice and you are ready to go. No need for extra configuration.

```JavaScript
node1.once('peer:connect', (peer) => {
  console.log('connected to %s', peer.id.toB58String())

  series([
    // node1 subscribes to "news"
    (cb) => node1.pubsub.subscribe(
      'news',
      (msg) => console.log(`node1 received: ${msg.data.toString()}`),
      cb
    ),
    (cb) => setTimeout(cb, 500),
    // node2 subscribes to "news"
    (cb) => node2.pubsub.subscribe(
      'news',
      (msg) => console.log(`node2 received: ${msg.data.toString()}`),
      cb
    ),
    (cb) => setTimeout(cb, 500),
    // node2 publishes "news" every second
    (cb) => {
      setInterval(() => {
        node2.pubsub.publish(
          'news',
          Buffer.from('Bird bird bird, bird is the word!'),
          (err) => {
            if (err) { throw err }
          }
        )
      }, 1000)
      cb()
    },
  ], (err) => {
    if (err) { throw err }
  })
})
```

The output of the program should look like:

```
> node 1.js
connected to QmWpvkKm6qHLhoxpWrTswY6UMNWDyn8hN265Qp9ZYvgS82
node2 received: Bird bird bird, bird is the word!
node1 received: Bird bird bird, bird is the word!
node2 received: Bird bird bird, bird is the word!
node1 received: Bird bird bird, bird is the word!
```

You can change the pubsub `emitSelf` option if you don't want that the publishing node also receives its own messages.

```JavaScript
const defaults = {
  config: {
    peerDiscovery: {
      mdns: {
        interval: 2000,
        enabled: true
      }
    },
    pubsub: {
      enabled: true,
      emitSelf: false
    }
  }
}
```

## 2. Future work

libp2p/IPFS PubSub is enabling a whole set of Distributed Real Time applications using CRDT (Conflict-Free Replicated Data Types). It is still going through heavy research (and hacking) and we invite you to join the conversation at [research-CRDT](https://github.com/ipfs/research-CRDT). Here is a list of some of the exciting examples:

- [PubSub Room](https://github.com/ipfs-labs/ipfs-pubsub-room)
- [Live DB - A always in Sync DB using CRDT](https://github.com/ipfs-labs/ipfs-live-db)
- [IIIF Annotations over IPFS, CRDT and libp2p](https://www.youtube.com/watch?v=hmAniA6g9D0&feature=youtu.be&t=10m40s)
- [orbit.chat - p2p chat application, fully running in the browser with js-ipfs, js-libp2p and orbit-db](http://orbit.chat/)
