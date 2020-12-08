# Configuration

- [Configuration](#configuration)
  - [Overview](#overview)
  - [Modules](#modules)
    - [Transport](#transport)
    - [Stream Multiplexing](#stream-multiplexing)
    - [Connection Encryption](#connection-encryption)
    - [Peer Discovery](#peer-discovery)
    - [Content Routing](#content-routing)
    - [Peer Routing](#peer-routing)
    - [DHT](#dht)
    - [Pubsub](#pubsub)
  - [Customizing libp2p](#customizing-libp2p)
    - [Examples](#examples)
      - [Basic setup](#basic-setup)
      - [Customizing Peer Discovery](#customizing-peer-discovery)
      - [Setup webrtc transport and discovery](#setup-webrtc-transport-and-discovery)
      - [Customizing Pubsub](#customizing-pubsub)
      - [Customizing DHT](#customizing-dht)
      - [Setup with Content and Peer Routing](#setup-with-content-and-peer-routing)
      - [Setup with Relay](#setup-with-relay)
      - [Setup with Auto Relay](#setup-with-auto-relay)
      - [Setup with Keychain](#setup-with-keychain)
      - [Configuring Dialing](#configuring-dialing)
      - [Configuring Connection Manager](#configuring-connection-manager)
      - [Configuring Transport Manager](#configuring-transport-manager)
      - [Configuring Metrics](#configuring-metrics)
      - [Configuring PeerStore](#configuring-peerstore)
      - [Customizing Transports](#customizing-transports)
  - [Configuration examples](#configuration-examples)

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

The libp2p ecosystem contains at least one module for each of these subsystems. The user should install and import the modules that are relevant for their requirements. Moreover, thanks to the existing interfaces it is easy to create a libp2p compatible module and use it.

After selecting the modules to use, it is also possible to configure each one according to your needs.

Bear in mind that a **transport** and **connection encryption** module are **required**, while all the other subsystems are optional.

### Transport

> In a p2p system, we need to interact with other peers in the network. Transports are used to establish connections between peers. The libp2p transports to use should be decided according to the environment where your node will live, as well as other requirements that you might have.

Some available transports are:

- [libp2p/js-libp2p-tcp](https://github.com/libp2p/js-libp2p-tcp)
- [libp2p/js-libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [libp2p/js-libp2p-webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct)
- [libp2p/js-libp2p-websockets](https://github.com/libp2p/js-libp2p-websockets)
- [libp2p/js-libp2p-utp](https://github.com/libp2p/js-libp2p-utp) (Work in Progress)

You should take into consideration that `js-libp2p-tcp` and `js-libp2p-utp` are not available in a **browser** environment.

If none of the available transports fulfills your needs, you can create a libp2p compatible transport. A libp2p transport just needs to be compliant with the [Transport Interface](https://github.com/libp2p/js-interfaces/tree/master/src/transport).

If you want to know more about libp2p transports, you should read the following content:

- https://docs.libp2p.io/concepts/transport
- https://github.com/libp2p/specs/tree/master/connections

### Stream Multiplexing

> Libp2p peers will need to communicate with each other through several protocols during their life. Stream multiplexing allows multiple independent logical streams to share a common underlying transport medium, instead of creating a new connection with the same peer per needed protocol.

Some available stream multiplexers are:

- [libp2p/js-libp2p-mplex](https://github.com/libp2p/js-libp2p-mplex)

If none of the available stream multiplexers fulfills your needs, you can create a libp2p compatible stream multiplexer. A libp2p multiplexer just needs to be compliant with the [Stream Muxer Interface](https://github.com/libp2p/js-interfaces/tree/master/src/stream-muxer).

If you want to know more about libp2p stream multiplexing, you should read the following content:

- https://docs.libp2p.io/concepts/stream-multiplexing
- https://github.com/libp2p/specs/tree/master/connections
- https://github.com/libp2p/specs/tree/master/mplex

### Connection Encryption

> A connection encryption mechanism must be used, in order to ensure all exchanged data between two peers is encrypted.

Some available connection encryption protocols:

- [NodeFactoryIo/js-libp2p-noise](https://github.com/NodeFactoryIo/js-libp2p-noise)
- [libp2p/js-libp2p-secio](https://github.com/libp2p/js-libp2p-secio) ⚠️ [DEPRECATED](https://blog.ipfs.io/2020-08-07-deprecating-secio)

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
- [discv5](https://github.com/chainsafe/discv5)

**Note**: `peer-discovery` services within transports (such as `js-libp2p-webrtc-star`) are automatically gathered from the `transport`, via it's `discovery` property. As such, they do not need to be added in the discovery modules. However, these transports can also be configured and disabled as the other ones.

If none of the available peer discovery protocols fulfills your needs, you can create a libp2p compatible one. A libp2p peer discovery protocol just needs to be compliant with the [Peer Discovery Interface](https://github.com/libp2p/js-interfaces/tree/master/src/peer-discovery).

If you want to know more about libp2p peer discovery, you should read the following content:

- https://github.com/libp2p/specs/blob/master/discovery/mdns.md

### Content Routing

> Content routing provides a way to find where content lives in the network. It works in two steps: 1) Peers provide (announce) to the network that they are holders of specific content and 2) Peers issue queries to find where that content lives. A Content Routing mechanism could be as complex as a DHT or as simple as a registry somewhere in the network.

Some available content routing modules are:

- [js-libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [js-libp2p-delegated-content-routing](https://github.com/libp2p/js-libp2p-delegated-content-routing)

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

### Pubsub

> Publish/Subscribe is a system where peers congregate around topics they are interested in. Peers interested in a topic are said to be subscribed to that topic and should receive the data published on it from other peers.

Some available pubsub routers are:

- [libp2p/js-libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub)
- [ChainSafe/js-libp2p-gossipsub](https://github.com/ChainSafe/js-libp2p-gossipsub)

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
- `peerId`: the identity of the node, an instance of [libp2p/js-peer-id](https://github.com/libp2p/js-peer-id).
  - This is particularly useful if you want to reuse the same `peer-id`, as well as for modules like `libp2p-delegated-content-routing`, which need a `peer-id` in their instantiation.
- `addresses`: an object containing `listen`, `announce` and `announceFilter`:
  - `listen` addresses will be provided to the libp2p underlying transports for listening on them.
  - `announce` addresses will be used to compute the advertises that the node should advertise to the network.
  - `announceFilter`: filter function used to filter announced addresses programmatically: `(ma: Array<multiaddr>) => Array<multiaddr>`. Default: returns all addresses. [`libp2p-utils`](https://github.com/libp2p/js-libp2p-utils) provides useful [multiaddr utilities](https://github.com/libp2p/js-libp2p-utils/blob/master/API.md#multiaddr-isloopbackma) to create your filters.

### Examples

#### Basic setup

```js
// Creating a libp2p node with:
//   transport: websockets + tcp
//   stream-muxing: mplex
//   crypto-channel: noise
//   discovery: multicast-dns
//   dht: kad-dht
//   pubsub: gossipsub

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
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
    connEncryption: [NOISE],
    peerDiscovery: [MulticastDNS],
    dht: DHT,
    pubsub: GossipSub
  }
})
```

#### Customizing Peer Discovery

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const MulticastDNS = require('libp2p-mdns')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE],
    peerDiscovery: [MulticastDNS]
  },
  config: {
    peerDiscovery: {
      autoDial: true,             // Auto connect to discovered peers (limited by ConnectionManager minConnections)
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

#### Setup webrtc transport and discovery

```js

const Libp2p = require('libp2p')
const WS = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const node = await Libp2p.create({
  modules: {
    transport: [
      WS,
      WebRTCStar
    ],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE],
  },
  config: {
    peerDiscovery: {
      [WebRTCStar.tag]: {
        enabled: true
      }
    }
  }
})
```

#### Customizing Pubsub

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const GossipSub = require('libp2p-gossipsub')

const { SignaturePolicy } = require('libp2p-interfaces/src/pubsub/signature-policy')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE],
    pubsub: GossipSub
  },
  config: {
    pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
      enabled: true,
      emitSelf: false,                                  // whether the node should emit to self on publish
      globalSignaturePolicy: SignaturePolicy.StrictSign // message signing policy
    }
  }
})
```

#### Customizing DHT

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const DHT = require('libp2p-kad-dht')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE],
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

#### Setup with Content and Peer Routing

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const PeerId = require('peer-id')

// create a peerId
const peerId = await PeerId.create()

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE],
    contentRouting: [
      new DelegatedContentRouter(peerId)
    ],
    peerRouting: [
      new DelegatedPeerRouter()
    ],
  },
  peerId,
  peerRouting: { // Peer routing configuration
    refreshManager: { // Refresh known and connected closest peers
      enabled: true, // Should find the closest peers.
      interval: 6e5, // Interval for getting the new for closest peers of 10min
      bootDelay: 10e3 // Delay for the initial query for closest peers
    }
  }
})
```

#### Setup with Relay

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  config: {
    relay: {                   // Circuit Relay options (this config is part of libp2p core configurations)
      enabled: true,           // Allows you to dial and accept relayed connections. Does not make you a relay.
      hop: {
        enabled: true,         // Allows you to be a relay for other peers
        active: true           // You will attempt to dial destination peers if you are not connected to them
      },
      advertise: {
        bootDelay: 15 * 60 * 1000, // Delay before HOP relay service is advertised on the network
        enabled: true,          // Allows you to disable the advertise of the Hop service
        ttl: 30 * 60 * 1000     // Delay Between HOP relay service advertisements on the network
      }
    }
  }
})
```

#### Setup with Auto Relay

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  config: {
    relay: {                   // Circuit Relay options (this config is part of libp2p core configurations)
      enabled: true,           // Allows you to dial and accept relayed connections. Does not make you a relay.
      autoRelay: {
        enabled: true,         // Allows you to bind to relays with HOP enabled for improving node dialability
        maxListeners: 2         // Configure maximum number of HOP relays to use
      }
    }
  }
})
```

#### Setup with Keychain

Libp2p allows you to setup a secure keychain to manage your keys. The keychain configuration object should have the following properties:

| Name | Type | Description |
|------|------|-------------|
| pass | `string` | Passphrase to use in the keychain (minimum of 20 characters). |
| datastore | `object` | must implement [ipfs/interface-datastore](https://github.com/ipfs/interface-datastore) |

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const LevelStore = require('datastore-level')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  keychain: {
    pass: 'notsafepassword123456789',
    datastore: new LevelStore('path/to/store')
  }
})

await libp2p.loadKeychain()
```

#### Configuring Dialing

Dialing in libp2p can be configured to limit the rate of dialing, and how long dials are allowed to take. The dialer configuration object should have the following properties:

| Name | Type | Description |
|------|------|-------------|
| maxParallelDials | `number` | How many multiaddrs we can dial in parallel. |
| maxDialsPerPeer | `number` | How many multiaddrs we can dial per peer, in parallel. |
| dialTimeout | `number` | Second dial timeout per peer in ms. |
| resolvers | `object` | Dial [Resolvers](https://github.com/multiformats/js-multiaddr/blob/master/src/resolvers/index.js) for resolving multiaddrs |
| addressSorter | `(Array<Address>) => Array<Address>` | Sort the known addresses of a peer before trying to dial. |

The below configuration example shows how the dialer should be configured, with the current defaults:

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const { dnsaddrResolver } = require('multiaddr/src/resolvers')
const { publicAddressesFirst } = require('libp2p-utils/src/address-sort')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  dialer: {
    maxParallelDials: 100,
    maxDialsPerPeer: 4,
    dialTimeout: 30e3,
    resolvers: {
      dnsaddr: dnsaddrResolver
    },
    addressSorter: publicAddressesFirst
  }
```

#### Configuring Connection Manager

The Connection Manager prunes Connections in libp2p whenever certain limits are exceeded. If Metrics are enabled, you can also configure the Connection Manager to monitor the bandwidth of libp2p and prune connections as needed. You can read more about what Connection Manager does at [./CONNECTION_MANAGER.md](./CONNECTION_MANAGER.md). The configuration values below show the defaults for Connection Manager. See [./CONNECTION_MANAGER.md](./CONNECTION_MANAGER.md#options) for a full description of the parameters.

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  connectionManager: {
    maxConnections: Infinity,
    minConnections: 0,
    pollInterval: 2000,
    defaultPeerValue: 1,
    // The below values will only be taken into account when Metrics are enabled
    maxData: Infinity,
    maxSentData: Infinity,
    maxReceivedData: Infinity,
    maxEventLoopDelay: Infinity,
    movingAverageInterval: 60000
  }
})
```

#### Configuring Transport Manager

The Transport Manager is responsible for managing the libp2p transports life cycle. This includes starting listeners for the provided listen addresses, closing these listeners and dialing using the provided transports. By default, if a libp2p node has a list of multiaddrs for listenning on and there are no valid transports for those multiaddrs, libp2p will throw an error on startup and shutdown. However, for some applications it is perfectly acceptable for libp2p nodes to start in dial only mode if all the listen multiaddrs failed. This error tolerance can be enabled as follows:

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const { FaultTolerance } = require('libp2p/src/transport-manager')}

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  transportManager: {
    faultTolerance: FaultTolerance.NO_FATAL
  }
})
```

#### Configuring Metrics

Metrics are disabled in libp2p by default. You can enable and configure them as follows:

| Name | Type | Description |
|------|------|-------------|
| enabled | `boolean` | Enabled metrics collection. |
| computeThrottleMaxQueueSize | `number` | How many messages a stat will queue before processing. |
| computeThrottleTimeout | `number` | Time in milliseconds a stat will wait, after the last item was added, before processing. |
| movingAverageIntervals | `Array<number>` | The moving averages that will be computed. |
| maxOldPeersRetention | `number` | How many disconnected peers we will retain stats for. |

The below configuration example shows how the metrics should be configured. Aside from enabled being `false` by default, the following default configuration options are listed below:

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  metrics: {
    enabled: true,
    computeThrottleMaxQueueSize: 1000,
    computeThrottleTimeout: 2000,
    movingAverageIntervals: [
      60 * 1000, // 1 minute
      5 * 60 * 1000, // 5 minutes
      15 * 60 * 1000 // 15 minutes
    ],
    maxOldPeersRetention: 50
  }
})
```

#### Configuring PeerStore

PeerStore persistence is disabled in libp2p by default. You can enable and configure it as follows. Aside from enabled being `false` by default, it will need an implementation of a [datastore](https://github.com/ipfs/interface-datastore). Take into consideration that using the memory datastore will be ineffective for persistence.

The threshold number represents the maximum number of "dirty peers" allowed in the PeerStore, i.e. peers that are not updated in the datastore. In this context, browser nodes should use a threshold of 1, since they might not "stop" properly in several scenarios and the PeerStore might end up with unflushed records when the window is closed.

| Name | Type | Description |
|------|------|-------------|
| persistence | `boolean` | Is persistence enabled. |
| threshold | `number` | Number of dirty peers allowed. |

The below configuration example shows how the PeerStore should be configured. Aside from persistence being `false` by default, the following default configuration options are listed below:

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const LevelStore = require('datastore-level')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  datastore: new LevelStore('path/to/store'),
  peerStore: {
    persistence: true,
    threshold: 5
  }
})
```

#### Customizing Transports

Some Transports can be passed additional options when they are created. For example, `libp2p-webrtc-star` accepts an optional, custom `wrtc` implementation. In addition to libp2p passing itself and an `Upgrader` to handle connection upgrading, libp2p will also pass the options, if they are provided, from `config.transport`.

```js
const Libp2p = require('libp2p')
const WebRTCStar = require('libp2p-webrtc-star')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const wrtc = require('wrtc')

const transportKey = WebRTCStar.prototype[Symbol.toStringTag]
const node = await Libp2p.create({
  modules: {
    transport: [WebRTCStar],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  config: {
    transport: {
      [transportKey]: {
        wrtc // You can use `wrtc` when running in Node.js
      }
    }
  }
})
```

## Configuration examples

As libp2p is designed to be a modular networking library, its usage will vary based on individual project needs. We've included links to some existing project configurations for your reference, in case you wish to replicate their configuration:

- [libp2p-ipfs-nodejs](https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs/src/core/runtime/libp2p-nodejs.js) - libp2p configuration used by js-ipfs when running in Node.js
- [libp2p-ipfs-browser](https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs/src/core/runtime/libp2p-browser.js) - libp2p configuration used by js-ipfs when running in a Browser (that supports WebRTC)

If you have developed a project using `js-libp2p`, please consider submitting your configuration to this list so that it can be found easily by other users.

The [examples](../examples) are also a good source of help for finding a configuration that suits your needs.
