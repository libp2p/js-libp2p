# Peer Discovery Mechanisms

A Peer Discovery module enables libp2p to find peers to connect to. Think of these mechanisms as ways to join the rest of the network, as railing points.

With this system, a libp2p node can both have a set of nodes to always connect on boot (bootstraper nodes), discover nodes through locality (e.g connected in the same LAN) or through serendipity (random walks on a DHT).

These mechanisms save configuration and enable a node to operate without any explicit dials, it will just work. Once new peers are discovered, their known data is stored in the peer's PeerStore.

## 1. Bootstrap list of Peers when booting a node

For this demo, we will connect to IPFS default bootstrapper nodes and so, we will need to support the same set of features those nodes have, that are: TCP, mplex, and NOISE. You can see the complete example at [1.js](./1.js).

First, we create our libp2p node.

```JavaScript
import { createLibp2p } from 'libp2p'
import { Bootstrap } from '@libp2p/bootstrap'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'

const node = await createLibp2p({
  transports: [
    new TCP()
  ],
  streamMuxers: [
    new Mplex()
  ],
  connectionEncryption: [
    new Noise()
  ],
  peerDiscovery: [
    new Bootstrap({
      interval: 60e3,
      list: bootstrapers
    })
  ]
})
```

In this configuration, we use a `bootstrappers` array listing peers to connect _on boot_. Here is the list used by js-ipfs and go-ipfs.

```JavaScript
const bootstrapers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
]
```

Now, once we create and start the node, we can listen for events such as `peer:discovery` and `peer:connect`, these events tell us when we found a peer, independently of the discovery mechanism used and when we actually dialed to that peer.

```JavaScript
const node = await createLibp2p({
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  },
  transports: [
    new TCP()
  ],
  streamMuxers: [
    new Mplex()
  ],
  connectionEncryption: [
    new Noise()
  ],
  peerDiscovery: [
    new Bootstrap({
      interval: 60e3,
      list: bootstrapers
    })
  ]
})

node.connectionManager.addEventListener('peer:connect', (evt) => {
  console.log('Connection established to:', evt.detail.remotePeer.toString())	// Emitted when a new connection has been created
})

node.addEventListener('peer:discovery', (evt) => {
  // No need to dial, autoDial is on
  console.log('Discovered:', evt.detail.id.toString())
})

await node.start()
```

From running [1.js](./1.js), you should see the following:

```bash
> node 1.js
Discovered: QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ
Discovered: QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
Discovered: QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb
Discovered: QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp
Discovered: QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa
Discovered: QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt
Connection established to: QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ
Connection established to: QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
Connection established to: QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp
Connection established to: QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa
Connection established to: QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt
Connection established to: QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb
```

## 2. MulticastDNS to find other peers in the network

For this example, we need `@libp2p/mdns`, go ahead and `npm install` it. You can find the complete solution at [2.js](./2.js).

Update your libp2p configuration to include MulticastDNS.

```JavaScript
import { createLibp2p } from 'libp2p'
import { MulticastDNS } from '@libp2p/mdns'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'

const createNode = () => {
  return createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Noise()
    ],
    peerDiscovery: [
      new MulticastDNS({
        interval: 20e3
      })
    ]
  })
}
```

To observe it working, spawn two nodes.

```JavaScript
const [node1, node2] = await Promise.all([
  createNode(),
  createNode()
])

node1.addEventListener('peer:discovery', (evt) => console.log('Discovered:', evt.detail.id.toString()))
node2.addEventListener('peer:discovery', (evt) => console.log('Discovered:', evt.detail.id.toString()))

await Promise.all([
  node1.start(),
  node2.start()
])
```

If you run this example, you will see the other peers being discovered.

```bash
> node 2.js
Discovered: QmSSbQpuKrxkoXHm1v4Pi35hPN5hUHMZoBoawEs2Nhvi8m
Discovered: QmRcXXhtG8vTqwVBRonKWtV4ovDoC1Fe56WYtcrw694eiJ
```

## 3. Pubsub based Peer Discovery

For this example, we need [`@libp2p/pubsub-peer-discovery`](https://github.com/libp2p/js-libp2p-pubsub-peer-discovery/), go ahead and `npm install` it. You also need to spin up a set of [`libp2p-relay-servers`](https://github.com/libp2p/js-libp2p-relay-server). These servers act as relay servers and a peer discovery source.

In the context of this example, we will create and run the `libp2p-relay-server` in the same code snippet. You can find the complete solution at [3.js](./3.js).

You can create your libp2p nodes as follows:

```js
import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { Bootstrap } from '@libp2p/bootstrap'
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'

const createNode = async (bootstrapers) => {
  const node = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Noise()
    ],
    pubsub: new GossipSub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      new Bootstrap({
        interval: 60e3,
        list: bootstrapers
      }),
      new PubSubPeerDiscovery({
        interval: 1000
      })
    ]
  })

  return node
}
```

We will use the `libp2p-relay-server` as bootstrap nodes for the libp2p nodes, so that they establish a connection with the relay after starting. As a result, after they establish a connection with the relay, the pubsub discovery will kick in and the relay will advertise them.

```js
const relay = await createLibp2p({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0'
      ]
    },
    transports: [new TCP()],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    pubsub: new GossipSub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      new PubSubPeerDiscovery({
        interval: 1000
      })
    ],
    relay: {
      enabled: true, // Allows you to dial and accept relayed connections. Does not make you a relay.
      hop: {
        enabled: true // Allows you to be a relay for other peers
      }
    }
})

console.log(`libp2p relay starting with id: ${relay.peerId.toString()}`)

await relay.start()

const relayMultiaddrs = relay.getMultiaddrs()

const [node1, node2] = await Promise.all([
  createNode(relayMultiaddrs),
  createNode(relayMultiaddrs)
])

node1.addEventListener('peer:discovery', (evt) => {
  console.log(`Peer ${node1.peerId.toString()} discovered: ${evt.detail.id.toString()}`)
})
node2.addEventListener('peer:discovery', (evt) => {
  console.log(`Peer ${node2.peerId.toString()} discovered: ${evt.detail.id.toString()}`)
})

;[node1, node2].forEach((node, index) => console.log(`Node ${index} starting with id: ${node.peerId.toString()}`))

await Promise.all([
  node1.start(),
  node2.start()
])
```

If you run this example, you will see the other peers being discovered.

```bash
> node 3.js
libp2p relay starting with id: QmW6FqVV6RsyoGC5zaeFGW9gSWA3LcBRVZrjkKMruh38Bo
Node 0 starting with id: QmezqDTmEjZ5BfMgVqjSpLY19mVVLTQ9bE9mRpZwtGxL8N
Node 1 starting with id: QmYWeom2odTkm79DzB68NHULqVHDaNDqHhoyqLdcV1fqdv
Peer QmezqDTmEjZ5BfMgVqjSpLY19mVVLTQ9bE9mRpZwtGxL8N discovered: QmW6FqVV6RsyoGC5zaeFGW9gSWA3LcBRVZrjkKMruh38Bo
Peer QmYWeom2odTkm79DzB68NHULqVHDaNDqHhoyqLdcV1fqdv discovered: QmW6FqVV6RsyoGC5zaeFGW9gSWA3LcBRVZrjkKMruh38Bo
Peer QmYWeom2odTkm79DzB68NHULqVHDaNDqHhoyqLdcV1fqdv discovered: QmezqDTmEjZ5BfMgVqjSpLY19mVVLTQ9bE9mRpZwtGxL8N
Peer QmezqDTmEjZ5BfMgVqjSpLY19mVVLTQ9bE9mRpZwtGxL8N discovered: QmYWeom2odTkm79DzB68NHULqVHDaNDqHhoyqLdcV1fqdv
```

Taking into account the output, after the relay and both libp2p nodes start, both libp2p nodes will discover the bootstrap node (relay) and connect with it. After establishing a connection with the relay, they will discover each other.

This is really useful when running libp2p in constrained environments like a browser. You can run a set of `libp2p-relay-server` nodes that will be responsible for both relaying websocket connections between browser nodes and for discovering other browser peers.

## 4. Where to find other Peer Discovery Mechanisms

There are plenty more Peer Discovery Mechanisms out there, you can:

- Find one in [@libp2p/webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star). Yes, a transport with discovery capabilities! This happens because WebRTC requires a rendezvous point for peers to exchange [SDP](https://tools.ietf.org/html/rfc4317) offer, which means we have one or more points that can introduce peers to each other. Think of it as MulticastDNS for the Web, as in MulticastDNS only works in LAN.
- Any DHT will offer you a discovery capability. You can simple _random-walk_ the routing tables to find other peers to connect to. For example [@libp2p/kad-dht](https://github.com/libp2p/js-libp2p-kad-dht) can be used for peer discovery. An example of how to configure it to enable random walks can be found [here](https://github.com/libp2p/js-libp2p/blob/v0.28.4/doc/CONFIGURATION.md#customizing-dht).
- You can create your own Discovery service, a registry, a list, a radio beacon, you name it!
