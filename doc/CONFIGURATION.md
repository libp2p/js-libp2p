# Configuration

* [Overview](#overview)
* [Modules](#modules)
  * [Transport](#transport)
  * [Stream Multiplexing](#stream-multiplexing)
  * [Connection Encryption](#connection-encryption)
  * [Peer Discovery](#peer-discovery)
  * [Content Routing](#content-routing)
  * [Peer Routing](#peer-routing)
  * [DHT](#dht)
  * [Pubsub](#pubsub)
* [Customizing Libp2p](#customizing-libp2p)
  * [Examples](#examples)
* [Configuration examples](#configuration-examples)

## Overview

libp2p is a modular networking stack. It's designed to be able to suit a variety of project needs. The configuration of libp2p is a key part of its structure. It enables you to bring exactly what you need, and only what you need. This document is a guide on how to configure libp2p for your particular project. Check out the [Configuration examples](#configuration-examples) section if you're just looking to leverage an existing configuration.

Regardless of how you configure libp2p, the top level [API](./API.md) will always remain the same. **Note**: if some modules are not configured, like Content Routing, using those methods will throw errors.

## Modules

`js-libp2p` acts as the composer for this modular p2p networking stack using libp2p compatible modules as its subsystems. For getting an instance of `js-libp2p` compliant with all types of networking requirements, it is possible to specify the following subsystems:

- Transports
- Multiplexers
- Connection encryption mechanisms
- Peer discovery protocols
- Content routing protocols
- Peer routing protocols
- DHT implementation
- Pubsub router

The libp2p ecosystem contains at least one module for each of these subsystems. This way, the user should install and import the modules that are relevant for their requirements. Moreover, thanks to the existing interfaces it is easy to create a libp2p compatible module and use it.

After selecting the modules to use, it is also possible to configure each one according to your needs.

Bear in mind that only a **transport** is required, being all the other subsystems optional.

### Transport

> In a p2p system, we need to interact with other peers in the network. Transports are used to establish connections between peers. The libp2p transports to use should be decided according to the environment where your node will live, as well as other requirements that you might have.

Some available transports are:

- [libp2p/js-libp2p-tcp](https://github.com/libp2p/js-libp2p-tcp)
- [libp2p/js-libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [libp2p/js-libp2p-webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct)
- [libp2p/js-libp2p-websockets](https://github.com/libp2p/js-libp2p-websockets)
- [libp2p/js-libp2p-utp](https://github.com/libp2p/js-libp2p-utp) (Work in Progress)

If none of the available transports fulfills your needs, you can create a libp2p compatible transport. A libp2p transport just needs to be compliant with the [Transport Interface](https://github.com/libp2p/js-interfaces/tree/master/src/transport).

If you want to know more about libp2p transports, you should read the following content:

- https://docs.libp2p.io/concepts/transport
- https://github.com/libp2p/specs/tree/master/connections

### Stream Multiplexing

> Libp2p peers will need to communicate with each other through several protocols during their life. Stream multiplexing allows multiple independent logical streams to share a common underlying transport medium, instead of creating a new connection with the same peer per needed protocol.

Some available stream multiplxers are:

- [libp2p/js-libp2p-mplex](https://github.com/libp2p/js-libp2p-mplex)

If none of the available stream multiplexers fulfills your needs, you can create a libp2p compatible stream multiplexer. A libp2p multiplexer just needs to be compliant with the [Stream Muxer Interface](https://github.com/libp2p/js-interfaces/tree/master/src/stream-muxer).

If you want to know more about libp2p stream multiplexing, you should read the following content:

- https://docs.libp2p.io/concepts/stream-multiplexing
- https://github.com/libp2p/specs/tree/master/connections
- https://github.com/libp2p/specs/tree/master/mplex

### Connection Encryption

> A connection encryption mechanism should be used, in order to ensure all exchanged data between two peers is encrypted.

Some available connection encryption protocols:

- [libp2p/js-libp2p-secio](https://github.com/libp2p/js-libp2p-secio)

If none of the available connection encryption mechanisms fulfills your needs, you can create a libp2p compatible one. A libp2p connection encryption protocol just needs to be compliant with the [Crypto Interface](https://github.com/libp2p/js-interfaces/tree/master/src/crypto).

If you want to know more about libp2p connection encryption, you should read the following content:

- https://docs.libp2p.io/concepts/secure-comms
- https://github.com/libp2p/specs/tree/master/connections

### Peer Discovery

> In a p2p network, peer discovery is critical to a functioning system.

Some available peer discovery modules are:

- [js-libp2p-mdns](https://github.com/libp2p/js-libp2p-mdns)
- [js-libp2p-bootstrap](https://github.com/libp2p/js-libp2p-bootstrap)
- [js-libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [js-libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)

If none of the available peer discovery protocols fulfills your needs, you can create a libp2p compatible one. A libp2p peer discovery protocol just needs to be compliant with the [Peer Discovery Interface](https://github.com/libp2p/js-interfaces/tree/master/src/peer-discovery).

If you want to know more about libp2p peer discovery, you should read the following content:

- https://github.com/libp2p/specs/blob/master/discovery/mdns.md

### Content Routing

> Content routing provides a way to find where content lives in the network. It works in two steps: 1) Peers provide (announce) to the network that they are holders of specific content and 2) Peers issue queries to find where that content lives. A Content Routing mechanism could be as complex as a DHT or as simple as a registry somewhere in the network.

Some available content routing modules are:

- [js-libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [js-libp2p-delegated-peer-routing](https://github.com/libp2p/js-libp2p-delegated-peer-routing)

If none of the available content routing protocols fulfills your needs, you can create a libp2p compatible one. A libp2p content routing protocol just needs to be compliant with the [Content Routing Interface](https://github.com/libp2p/js-interfaces/tree/master/src/content-routing). **(WIP: This module is not yet implemented)**

If you want to know more about libp2p content routing, you should read the following content:

- https://docs.libp2p.io/concepts/content-routing

### Peer Routing

> Peer Routing offers a way to find other peers in the network by issuing queries using a Peer Routing algorithm, which may be iterative or recursive. If the algorithm is unable to find the target peer, it will return the peers that are "closest" to the target peer, using a distance metric defined by the algorithm.

Some available peer routing modules are:

- [js-libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [js-libp2p-delegated-peer-routing](https://github.com/libp2p/js-libp2p-delegated-peer-routing)

If none of the available peer routing protocols fulfills your needs, you can create a libp2p compatible one. A libp2p peer routing protocol just needs to be compliant with the [Peer Routing Interface](https://github.com/libp2p/js-interfaces/tree/master/src/peer-routing). **(WIP: This module is not yet implemented)**

If you want to know more about libp2p peer routing, you should read the following content:

- https://docs.libp2p.io/concepts/peer-routing

### DHT

> A DHT can provide content and peer routing capabilities in a p2p system, as well as peer discovery capabilities.

The DHT implementation currently available is [libp2p/js-libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht). This implementation is largely based on the Kademlia whitepaper, augmented with notions from S/Kademlia, Coral and mainlineDHT.

If this DHT implementation does not fulfill your needs and you want to create or use your own implementation, please get in touch with us through a github issue. We plan to work on improving the ability to bring your own DHT in a future release.

If you want to know more about libp2p DHT, you should read the following content:

- https://docs.libp2p.io/concepts/protocols/#kad-dht
- https://github.com/libp2p/specs/pull/108

#### Pubsub

> Publish/Subscribe is a system where peers congregate around topics they are interested in. Peers interested in a topic are said to be subscribed to that topic and should receive the data published on it from other peers.

Some available pubsub routers are:

- [libp2p/js-libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub)
- [ChainSafe/gossipsub-js](https://github.com/ChainSafe/gossipsub-js)

If none of the available pubsub routers fulfills your needs, you can create a libp2p compatible one. A libp2p pubsub router just needs to be created on top of [libp2p/js-libp2p-pubsub](https://github.com/libp2p/js-libp2p-pubsub), which ensures `js-libp2p` API expectations.

If you want to know more about libp2p pubsub, you should read the following content:

- https://docs.libp2p.io/concepts/publish-subscribe
- https://github.com/libp2p/specs/tree/master/pubsub

## Customizing libp2p

When [creating a libp2p node](./API.md#create), the modules needed should be specified as follows:

```js
const modules = {
  transport: [],
  streamMuxer: [],
  connEncryption: [],
  contentRouting: [],
  peerRouting: [],
  peerDiscovery: [],
  dht: dhtImplementation,
  pubsub: pubsubImplementation
}
```

Moreover, the majority of the modules can be customized via option parameters. This way, it is also possible to provide this options through a `config` object. This config object should have the property name of each building block to configure, the same way as the modules specification.

Besides the `modules` and `config`, libp2p allows other internal options and configurations:
- `datastore`: an instance of [ipfs/interface-datastore](https://github.com/ipfs/interface-datastore/) modules.
  - This is used in modules such as the DHT. If it is not provided, `js-libp2p` will use an in memory datastore.
- `peerInfo`: a previously created instance of [libp2p/js-peer-info](https://github.com/libp2p/js-peer-info).
  - This is particularly useful if you want to reuse the same `peer-id`, as well as for modules like `libp2p-delegated-content-routing`, which need a `peer-id` in their instantiation.

### Examples

**1) Basic setup**

```js
// Creating a libp2p node with:
//   transport: websockets + tcp
//   stream-muxing: mplex
//   crypto-channel: secio
//   discovery: multicast-dns
//   dht: kad-dht
//   pubsub: gossipsub

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')

const node = await Libp2p.create({
  modules: {
    transport: [
      TCP,
      new WS() // It can take instances too!
    ],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    peerDiscovery: [MulticastDNS],
    dht: DHT,
    pubsub: GossipSub
  }
})
```

**2) Customizing Peer Discovery**

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    peerDiscovery: [MulticastDNS]
  },
  config: {
    peerDiscovery: {
      autoDial: true,             // Auto connect to discovered peers (limited by ConnectionManager minPeers)
      // The `tag` property will be searched when creating the instance of your Peer Discovery service. 
      // The associated object, will be passed to the service when it is instantiated.
      [MulticastDNS.tag]: {
        interval: 1000,
        enabled: true
      }
      // .. other discovery module options.
    }
  }
})
```

**3) Customizing Pubsub**

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const GossipSub = require('libp2p-gossipsub')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    pubsub: GossipSub
  },
  config: {
    pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
      enabled: true,
      emitSelf: true,             // whether the node should emit to self on publish
      signMessages: true,         // if messages should be signed
      strictSigning: true         // if message signing should be required
    }
  }
})
```

**4) Customizing DHT**

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const DHT = require('libp2p-kad-dht')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    dht: DHT
  },
  config: {
    dht: {                        // The DHT options (and defaults) can be found in its documentation
      kBucketSize: 20,
      enabled: true,
      randomWalk: {
        enabled: true,            // Allows to disable discovery (enabled by default)
        interval: 300e3,
        timeout: 10e3
      }
    }
  }
})
```

**5) Setup with Content and Peer Routing**

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const PeerInfo = require('peer-info')

// create a peerInfo
const peerInfo = await PeerInfo.create()

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    contentRouting: [
      new DelegatedContentRouter(peerInfo.id)
    ],
    peerRouting: [
      new DelegatedPeerRouter()
    ],
  },
  peerInfo
})
```

**6) Setup with Relay**

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO]
  },
  relay: {                   // Circuit Relay options (this config is part of libp2p core configurations)
    enabled: true,
    hop: {
      enabled: true,
      active: true
    }
  },
})
```

## Configuration examples

As libp2p is designed to be a modular networking library, its usage will vary based on individual project needs. We've included links to some existing project configurations for your reference, in case you wish to replicate their configuration:


- [libp2p-ipfs-nodejs](https://github.com/ipfs/js-ipfs/tree/master/src/core/runtime/libp2p-nodejs.js) - libp2p configuration used by js-ipfs when running in Node.js
- [libp2p-ipfs-browser](https://github.com/ipfs/js-ipfs/tree/master/src/core/runtime/libp2p-browser.js) - libp2p configuration used by js-ipfs when running in a Browser (that supports WebRTC)

If you have developed a project using `js-libp2p`, please consider submitting your configuration to this list so that it can be found easily by other users.

The [examples](../examples) are also a good source of help for finding a configuration that suits your needs.
