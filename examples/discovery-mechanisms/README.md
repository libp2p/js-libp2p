# Peer Discovery Mechanisms

A Peer Discovery module enables libp2p to find peers to connect to. Think of these mechanisms as ways to join the rest of the network, as railing points.

With these system, a libp2p node can both have a set of nodes to always connect on boot (bootstraper nodes), discover nodes through locality (e.g connected in the same LAN) or through serendipity (random walks on a DHT).

These mechanisms save configuration and enable a node to operate without any explicit dials, it will just work. Once new peers are discovered, their known data is stored in the peer's PeerStore.

## 1. Bootstrap list of Peers when booting a node

For this demo, we will connect to IPFS default bootstrapper nodes and so, we will need to support the same set of features those nodes have, that are: TCP, mplex and NOISE. You can see the complete example at [1.js](./1.js).

First, we create our libp2p node.

```JavaScript
const Libp2p = require('libp2p')
const Bootstrap = require('libp2p-bootstrap')

const node = Libp2p.create({
  modules: {
    transport: [ TCP ],
    streamMuxer: [ Mplex ],
    connEncryption: [ NOISE ],
    peerDiscovery: [ Bootstrap ]
  },
  config: {
    peerDiscovery: {
      bootstrap: {
        interval: 60e3,
        enabled: true,
        list: bootstrapers
      }
    }
  }
})
```

In this configuration, we use a `bootstrappers` array listing peers to connect _on boot_. Here is the list used by js-ipfs and go-ipfs.

```JavaScript
const bootstrapers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/ip4/104.236.176.52/tcp/4001/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
  '/ip4/104.236.179.241/tcp/4001/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  '/ip4/162.243.248.213/tcp/4001/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  '/ip4/128.199.219.111/tcp/4001/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  '/ip4/104.236.76.40/tcp/4001/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  '/ip4/178.62.158.247/tcp/4001/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  '/ip4/178.62.61.185/tcp/4001/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  '/ip4/104.236.151.122/tcp/4001/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx'
]
```

Now, once we create and start the node, we can listen for events such as `peer:discovery` and `peer:connect`, these events tell us when we found a peer, independently of the discovery mechanism used and when we actually dialed to that peer.

```JavaScript
const node = await Libp2p.create({
  peerId,
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  }
  modules: {
    transport: [ TCP ],
    streamMuxer: [ Mplex ],
    connEncryption: [ NOISE ],
    peerDiscovery: [ Bootstrap ]
  },
  config: {
    peerDiscovery: {
      bootstrap: {
        interval: 60e3,
        enabled: true,
        list: bootstrapers
      }
    }
  }
})

node.connectionManager.on('peer:connect', (connection) => {
  console.log('Connection established to:', connection.remotePeer.toB58String())	// Emitted when a new connection has been created
})

node.on('peer:discovery', (peerId) => {
  // No need to dial, autoDial is on
  console.log('Discovered:', peerId.toB58String())
})

await node.start()
```

From running [1.js](./1.js), you should see the following:

```bash
> node 1.js
Discovered: QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ
Discovered: QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z
Discovered: QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM
Discovered: QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm
Discovered: QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu
Discovered: QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64
Discovered: QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd
Discovered: QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3
Discovered: QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx
Connection established to: QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ
Connection established to: QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z
Connection established to: QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM
Connection established to: QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm
Connection established to: QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu
Connection established to: QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64
Connection established to: QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd
Connection established to: QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3
Connection established to: QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx
```

## 2. MulticastDNS to find other peers in the network

For this example, we need `libp2p-mdns`, go ahead and `npm install` it. You can find the complete solution at [2.js](./2.js).

Update your libp2p configuration to include MulticastDNS.

```JavaScript
const Libp2p = require('libp2p')
const MulticastDNS = require('libp2p-mdns')

const createNode = () => {
  return Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    }
    modules: {
      transport: [ TCP ],
      streamMuxer: [ Mplex ],
      connEncryption: [ NOISE ],
      peerDiscovery: [ MulticastDNS ]
    },
    config: {
      peerDiscovery: {
        mdns: {
          interval: 20e3,
          enabled: true
        }
      }
    }
  })
}
```

To observe it working, spawn two nodes.

```JavaScript
const [node1, node2] = await Promise.all([
  createNode(),
  createNode()
])

node1.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))
node2.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))
```

If you run this example, you will see the other peers being discovered.

```bash
> node 2.js
Discovered: QmSSbQpuKrxkoXHm1v4Pi35hPN5hUHMZoBoawEs2Nhvi8m
Discovered: QmRcXXhtG8vTqwVBRonKWtV4ovDoC1Fe56WYtcrw694eiJ
```

## 3. Where to find other Peer Discovery Mechanisms

There are plenty more Peer Discovery Mechanisms out there, you can:

- Find one in [libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star). Yes, a transport with discovery capabilities! This happens because WebRTC requires a rendezvous point for peers to exchange [SDP](https://tools.ietf.org/html/rfc4317) offer, which means we have one or more points that can introduce peers to each other. Think of it as MulticastDNS for the Web, as in MulticastDNS only works in LAN.
- Any DHT will offer you a discovery capability. You can simple _random-walk_ the routing tables to find other peers to connect to. For example [libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht) can be used for peer discovery. An example how to configure it to enable random walks can be found [here](https://github.com/libp2p/js-libp2p/blob/v0.28.4/doc/CONFIGURATION.md#customizing-dht).
- You can create your own Discovery service, a registry, a list, a radio beacon, you name it!
