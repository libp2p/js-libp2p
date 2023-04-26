# Peer and Content Routing

DHTs (Distributed Hash Tables) are one of the most common building blocks used when creating P2P networks. However, the name doesn't make justice to all the benefits it brings and putting the whole set of features in one box has proven to be limiting when we want to integrate multiple pieces together. With this in mind, we've come up with a new definition for what a DHT offers: Peer Routing and Content Routing.

Peer Routing is the category of modules that offer a way to find other peers in the network by intentionally issuing queries, iterative or recursive, until a Peer is found or the closest Peers, given the Peer Routing algorithm strategy are found.

Content Routing is the category of modules that offer a way to find where content lives in the network, it works in two steps: 1) Peers provide (announce) to the network that they are holders of specific content (multihashes) and 2) Peers issue queries to find where that content lives. A Content Routing mechanism could be as complex as a Kademlia DHT or a simple registry somewhere in the network.

# 1. Using Peer Routing to find other peers

This example builds on top of the [Protocol and Stream Muxing](../protocol-and-stream-muxing). We need to install `@libp2p/kad-dht`, go ahead and `npm install @libp2p/kad-dht`. If you want to see the final version, open [1.js](./1.js).

First, let's update our config to support Peer Routing and Content Routing.

```JavaScript
import { createLibp2p } from 'libp2p'
import { kadDHT } from '@libp2p/kad-dht'
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
    dht: kadDHT()
  })

  return node
}
```

Once that is done, we can use the createNode function we developed in the previous example to create 3 nodes. Connect node 1 to node 2 and node 2 to node 3. We will use node 2 as a way to find the whereabouts of node 3

```JavaScript
const [node1, node2, node3] = await Promise.all([
  createNode(),
  createNode(),
  createNode()
])

await node1.peerStore.patch(node2.peerId, {
  multiaddrs: node2.getMultiaddrs()
})
await node2.peerStore.patch(node3.peerId, {
  mulitaddrs: node3.getMultiaddrs()
})

await Promise.all([
  node1.dial(node2.peerId),
  node2.dial(node3.peerId)
])

// Set up of the cons might take time
await new Promise(resolve => setTimeout(resolve, 100))

const peer = await node1.peerRouting.findPeer(node3.peerId)

console.log('Found it, multiaddrs are:')
peer.multiaddrs.forEach((ma) => console.log(ma.toString()))
```

You should see the output being something like:

```Bash
> node 1.js
Found it, multiaddrs are:
/ip4/127.0.0.1/tcp/63617
/ip4/192.168.86.41/tcp/63617
```

You have successfully used Peer Routing to find a peer that you were not directly connected. Now all you have to do is to dial to the multiaddrs you discovered.

# 2. Using Content Routing to find providers of content

With Content Routing, you can create records that are stored in multiple points in the network, these records can be resolved by you or other peers and they act as memos or rendezvous points. A great usage of this feature is to support discovery of content, where one node holds a file and instead of using a centralized tracker to inform other nodes that it holds that file, it simply puts a record in the network that can be resolved by other peers. Peer Routing and Content Routing are commonly known as Distributed Hash Tables, DHT.

You can find this example completed in [2.js](./2.js), however as you will see it is very simple to update the previous example.

Instead of calling `peerRouting.findPeer`, we will use `contentRouting.provide` and `contentRouting.findProviders`.

```JavaScript
import { CID } from 'multiformats/cid'
import all from 'it-all'

const cid = CID.parse('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
await node1.contentRouting.provide(cid)

console.log('Node %s is providing %s', node1.peerId.toString(), cid.toString())

const providers = await all(node3.contentRouting.findProviders(cid, { timeout: 5000 }))

console.log('Found provider:', providers[0].id.toString())
```

The output of your program should look like:

```bash
> node 2.js
Node QmSsmVPoTy3WpzwiNPnsKmonBaZjK2HitFs2nWUvwK31Pz is providing QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL
Found provider: QmSsmVPoTy3WpzwiNPnsKmonBaZjK2HitFs2nWUvwK31Pz
```

That's it, now you know how to find peers that have pieces of information that interest you!

# 3. Future Work

Currently, the only mechanisms for Peer and Content Routing come from the DHT, however we do have the intention to support:

- Multiple Peer Routing Mechanisms, including ones that do recursive searches (i.e [webrtc-explorer](http://daviddias.me/blog/webrtc-explorer-2-0-0-alpha-release/) like packet switching or [CJDNS](https://github.com/cjdelisle/cjdns) path finder)
- Content Routing via PubSub
- Content Routing via centralized index (i.e a tracker)
