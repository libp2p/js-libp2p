# Peer Discovery Mechanisms

A Peer Discovery module enables libp2p to find peers to connect to. Think of these mechanisms as ways to join the rest of the network, as railing points.

With these system, a libp2p node can both have a set of nodes to always connect on boot (bootstraper nodes), discover nodes through locality (e.g connected in the same LAN) or through serendipity (random walks on a DHT).

These mechanisms save configuration and enable a node to operate without any explicit dials, it will just work.

## 1. Bootstrap list of Peers when booting a node

For this demo, we will connect to IPFS default bootstrapper nodes and so, we will need to support the same set of features those nodes have, that are: TCP, multiplex and SECIO. You can see the complete example at [1.js](./1.js).

First, we create our libp2p bundle.

```JavaScript
class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Multiplex],
        crypto: [SECIO]
      },
      discovery: [new Railing(bootstrapers)]
    }
    super(modules, peerInfo)
  }
}
```

In this bundle, we use a `bootstrappers` array listing peers to connect _on boot_. Here is the list used by js-ipfs and go-ipfs.

```JavaScript
const bootstrapers = [
  '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
  '/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  '/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  '/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  '/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  '/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  '/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  '/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx'
]
```

Now, once we create and start the node, we can listen for events such as `peer:discovery` and `peer:connect`, these events tell us when we found a peer, independently of the discovery mechanism used and when we actually dialed to that peer.

```
let node

waterfall([
  (cb) => PeerInfo.create(cb),
  (peerInfo, cb) => {
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    node = new MyBundle(peerInfo)
    node.start(cb)
  }
], (err) => {
  if (err) { throw err }

  // Emitted when a peer has been found
  node.on('peer:discovery', (peer) => {
    console.log('Discovered:', peer.id.toB58String())
    // Note how we need to dial, even if just to warm up the Connection (by not
    // picking any protocol) in order to get a full Connection. The Peer Discovery
    // doesn't make any decisions for you.
    node.dial(peer, () => {})
  })

  // Once the dial is complete, this event is emitted.
  node.on('peer:connect', (peer) => {
    console.log('Connection established to:', peer.id.toB58String())
  })
})
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
Connection established to: QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3
Connection established to: QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd
Connection established to: QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64
Connection established to: QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm
Connection established to: QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM
Connection established to: QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx
Connection established to: QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ
Connection established to: QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z
Connection established to: QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu
```

## 2. MulticastDNS to find other peers in the network

For this example, we need `libp2p-mdns`, go ahead and `npm install` it. You can find the complete solution at [2.js](./2.js).

Update your libp2p bundle to include MulticastDNS.

```JavaScript
class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Multiplex],
        crypto: [SECIO]
      },
      // We set the interval here to 1 second so that is faster to observe. The
      // default is 10 seconds.
      discovery: [new MulticastDNS(peerInfo, { interval: 1000 })]
    }
    super(modules, peerInfo)
  }
}
```

To observe it working, spawn two nodes.

```JavaScript
parallel([
  (cb) => createNode(cb),
  (cb) => createNode(cb)
], (err, nodes) => {
  if (err) { throw err }

  const node1 = nodes[0]
  const node2 = nodes[1]

  node1.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))
  node2.on('peer:discovery', (peer) => console.log('Discovered:', peer.id.toB58String()))
})
```

If you run this example, you will see a continuous stream of each peer discovering each other.

```bash
> node 2.js
Discovered: QmSSbQpuKrxkoXHm1v4Pi35hPN5hUHMZoBoawEs2Nhvi8m
Discovered: QmRcXXhtG8vTqwVBRonKWtV4ovDoC1Fe56WYtcrw694eiJ
Discovered: QmSSbQpuKrxkoXHm1v4Pi35hPN5hUHMZoBoawEs2Nhvi8m
Discovered: QmRcXXhtG8vTqwVBRonKWtV4ovDoC1Fe56WYtcrw694eiJ
Discovered: QmSSbQpuKrxkoXHm1v4Pi35hPN5hUHMZoBoawEs2Nhvi8m
Discovered: QmRcXXhtG8vTqwVBRonKWtV4ovDoC1Fe56WYtcrw694eiJ
```

## 3. Where to find other Peer Discovery Mechanisms

There are plenty more Peer Discovery Mechanisms out there, you can:

- Find one in [libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star). Yes, a transport with discovery capabilities! This happens because WebRTC requires a rendezvous point for peers to exchange [SDP](https://tools.ietf.org/html/rfc4317) offer, which means we have one or more points that can introduce peers to each other. Think of it as MulticastDNS for the Web, as in MulticastDNS only works in LAN.
- Any DHT will offer you a discovery capability. You can simple _random-walk_ the routing tables to find other peers to connect to.
- You can create your own Discovery service, a registry, a list, a radio beacon, you name it!
