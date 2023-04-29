# Configuration <!-- omit in toc -->

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
    - [Setup with Automatic Reservations](#setup-with-automatic-reservations)
    - [Setup with Preconfigured Reservations](#setup-with-preconfigured-reservations)
    - [Setup with Keychain](#setup-with-keychain)
    - [Configuring Connection Manager](#configuring-connection-manager)
    - [Configuring Connection Gater](#configuring-connection-gater)
      - [Outgoing connections](#outgoing-connections)
      - [Incoming connections](#incoming-connections)
    - [Configuring Transport Manager](#configuring-transport-manager)
    - [Configuring Metrics](#configuring-metrics)
    - [Configuring PeerStore](#configuring-peerstore)
    - [Customizing Transports](#customizing-transports)
    - [Configuring UPnP NAT Traversal](#configuring-upnp-nat-traversal)
      - [Browser support](#browser-support)
      - [UPnP and NAT-PMP](#upnp-and-nat-pmp)
    - [Configuring protocol name](#configuring-protocol-name)
- [Configuration examples](#configuration-examples)
- [Limits](#limits)

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

- [@libp2p/tcp](https://github.com/libp2p/js-libp2p-tcp) (not available in browsers)
- [@libp2p/webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [@libp2p/webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct)
- [@libp2p/websockets](https://github.com/libp2p/js-libp2p-websockets)
- [@libp2p/webtransport](https://github.com/libp2p/js-libp2p-webtransport) (Work in Progress)

If none of the available transports fulfills your needs, you can create a libp2p compatible transport. A libp2p transport just needs to be compliant with the [Transport Interface](https://github.com/libp2p/js-interfaces/tree/master/src/transport).

If you want to know more about libp2p transports, you should read the following content:

- https://docs.libp2p.io/concepts/transport
- https://github.com/libp2p/specs/tree/master/connections

### Stream Multiplexing

> Libp2p peers will need to communicate with each other through several protocols during their life. Stream multiplexing allows multiple independent logical streams to share a common underlying transport medium, instead of creating a new connection with the same peer per needed protocol.

Some available stream multiplexers are:

- [@libp2p/mplex](https://github.com/libp2p/js-libp2p-mplex)
- [@chainsafe/libp2p-yamux](https://github.com/chainsafe/js-libp2p-yamux)

If none of the available stream multiplexers fulfills your needs, you can create a libp2p compatible stream multiplexer. A libp2p multiplexer just needs to be compliant with the [Stream Muxer Interface](https://github.com/libp2p/js-interfaces/tree/master/src/stream-muxer).

If you want to know more about libp2p stream multiplexing, you should read the following content:

- https://docs.libp2p.io/concepts/stream-multiplexing
- https://github.com/libp2p/specs/tree/master/connections
- https://github.com/libp2p/specs/tree/master/mplex

### Connection Encryption

> A connection encryption mechanism must be used, in order to ensure all exchanged data between two peers is encrypted.

Some available connection encryption protocols:

- [@chainsafe/libp2p-noise](https://github.com/chainsafe/js-libp2p-noise)
- [Plaintext](https://github.com/libp2p/js-libp2p/blob/master/src/insecure/index.ts) (Not for production use)

If none of the available connection encryption mechanisms fulfills your needs, you can create a libp2p compatible one. A libp2p connection encryption protocol just needs to be compliant with the [Crypto Interface](https://github.com/libp2p/js-interfaces/tree/master/src/crypto).

If you want to know more about libp2p connection encryption, you should read the following content:

- https://docs.libp2p.io/concepts/secure-comms
- https://github.com/libp2p/specs/tree/master/connections

### Peer Discovery

> In a p2p network, peer discovery is critical to a functioning system.

Some available peer discovery modules are:

- [@libp2p/mdns](https://github.com/libp2p/js-libp2p-mdns)
- [@libp2p/bootstrap](https://github.com/libp2p/js-libp2p-bootstrap)
- [@libp2p/kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [@libp2p/webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [@chainsafe/discv5](https://github.com/chainsafe/discv5)

**Note**: `peer-discovery` services within transports (such as `js-libp2p-webrtc-star`) are automatically gathered from the `transport`, via it's `discovery` property. As such, they do not need to be added in the discovery modules. However, these transports can also be configured and disabled as the other ones.

If none of the available peer discovery protocols fulfills your needs, you can create a libp2p compatible one. A libp2p peer discovery protocol just needs to be compliant with the [Peer Discovery Interface](https://github.com/libp2p/js-interfaces/tree/master/src/peer-discovery).

If you want to know more about libp2p peer discovery, you should read the following content:

- https://github.com/libp2p/specs/blob/master/discovery/mdns.md

### Content Routing

> Content routing provides a way to find where content lives in the network. It works in two steps: 1) Peers provide (announce) to the network that they are holders of specific content and 2) Peers issue queries to find where that content lives. A Content Routing mechanism could be as complex as a DHT or as simple as a registry somewhere in the network.

Some available content routing modules are:

- [@libp2p/kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [@libp2p/delegated-content-routing](https://github.com/libp2p/js-libp2p-delegated-content-routing)
- [@libp2p/ipni-content-routing](https://github.com/libp2p/js-ipni-content-routing)

If none of the available content routing protocols fulfil your needs, you can create a libp2p compatible one. A libp2p content routing protocol just needs to be compliant with the [Content Routing Interface](https://github.com/libp2p/js-interfaces/tree/master/src/content-routing).

If you want to know more about libp2p content routing, you should read the following content:

- https://docs.libp2p.io/concepts/content-routing

### Peer Routing

> Peer Routing offers a way to find other peers in the network by issuing queries using a Peer Routing algorithm, which may be iterative or recursive. If the algorithm is unable to find the target peer, it will return the peers that are "closest" to the target peer, using a distance metric defined by the algorithm.

Some available peer routing modules are:

- [@libp2p/kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [@libp2p/delegated-peer-routing](https://github.com/libp2p/js-libp2p-delegated-peer-routing)

If none of the available peer routing protocols fulfills your needs, you can create a libp2p compatible one. A libp2p peer routing protocol just needs to be compliant with the [Peer Routing Interface](https://github.com/libp2p/js-interfaces/tree/master/src/peer-routing). **(WIP: This module is not yet implemented)**

If you want to know more about libp2p peer routing, you should read the following content:

- https://docs.libp2p.io/concepts/peer-routing

### DHT

> A DHT can provide content and peer routing capabilities in a p2p system, as well as peer discovery capabilities.

The DHT implementation currently available is [@libp2p/kad-dht](https://github.com/libp2p/js-libp2p-kad-dht). This implementation is largely based on the Kademlia whitepaper, augmented with notions from S/Kademlia, Coral and mainlineDHT.

If this DHT implementation does not fulfill your needs and you want to create or use your own implementation, please get in touch with us through a github issue. We plan to work on improving the ability to bring your own DHT in a future release.

If you want to know more about libp2p DHT, you should read the following content:

- https://docs.libp2p.io/concepts/protocols/#kad-dht
- https://github.com/libp2p/specs/pull/108

### Pubsub

> Publish/Subscribe is a system where peers congregate around topics they are interested in. Peers interested in a topic are said to be subscribed to that topic and should receive the data published on it from other peers.

Some available pubsub routers are:

- [@chainsafe/libp2p-gossipsub](https://github.com/ChainSafe/js-libp2p-gossipsub)
- [@libp2p/floodsub](https://github.com/libp2p/js-libp2p-floodsub) (Not for production use)

If none of the available pubsub routers fulfills your needs, you can create a libp2p compatible one. A libp2p pubsub router just needs to be created on top of [@libp2p/pubsub](https://github.com/libp2p/js-libp2p-pubsub), which ensures `js-libp2p` API expectations.

If you want to know more about libp2p pubsub, you should read the following content:

- https://docs.libp2p.io/concepts/publish-subscribe
- https://github.com/libp2p/specs/tree/master/pubsub

## Customizing libp2p

When [creating a libp2p node](./API.md#create), the modules needed should be specified as follows:

```js
const modules = {
  transports: [],
  streamMuxers: [],
  connectionEncryption: [],
  contentRouting: [],
  peerRouting: [],
  peerDiscovery: [],
  services: {
    serviceKey: serviceImplementation
  }
}
```

Moreover, the majority of the modules can be customized via option parameters. This way, it is also possible to provide this options through a `config` object. This config object should have the property name of each building block to configure, the same way as the modules specification.

Besides the `modules` and `config`, libp2p allows other internal options and configurations:
- `datastore`: an instance of [ipfs/interface-datastore](https://github.com/ipfs/js-ipfs-interfaces/tree/master/packages/interface-datastore) modules.
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

import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { mdns } from '@libp2p/mdns'
import { kadDHT } from '@libp2p/kad-dht'
import { gossipsub } from 'libp2p-gossipsub'

const node = await createLibp2p({
  transports: [
    tcp(),
    webSockets()
  ],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  peerDiscovery: [MulticastDNS],
  services: {
    dht: kadDHT(),
    pubsub: gossipsub()
  }
})
```

#### Customizing Peer Discovery

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { mdns } from '@libp2p/mdns'
import { bootstrap } from '@libp2p/bootstrap'

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  peerDiscovery: [
    mdns({
      interval: 1000
    }),
    bootstrap(
      list: [ // A list of bootstrap peers to connect to starting up the node
        "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
      ],
      interval: 2000
    )
  ]
})
```

#### Setup webrtc transport and discovery

```js
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTCStar } from '@libp2p/webrtc-star'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'

const webRtc = webRTCStar()

const node = await createLibp2p({
  transports: [
    webSockets(),
    webRtc.transport
  ],
  peerDiscovery: [
    webRtc.discovery
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ]
})
```

#### Customizing Pubsub

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from 'libp2p-gossipsub'
import { SignaturePolicy } from '@libp2p/interface-pubsub'

const node = await createLibp2p({
    transports: [
      tcp()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      noise()
    ],
    services: {
      pubsub: gossipsub({
        emitSelf: false,                                  // whether the node should emit to self on publish
        globalSignaturePolicy: SignaturePolicy.StrictSign // message signing policy
      })
    }
  }
})
```

#### Customizing DHT

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { kadDHT } from '@libp2p/kad-dht'

const node = await createLibp2p({
  transports: [
    tcp()
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ],
  services: {
    dht: kadDHT({
      kBucketSize: 20,
      clientMode: false           // Whether to run the WAN DHT in client or server mode (default: client mode)
    })
  }
})
```

#### Setup with Content and Peer Routing

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { DelegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { DelegatedContentRouting} from '@libp2p/delegated-content-routing'

// create a peerId
const peerId = await PeerId.create()

const delegatedPeerRouting = new DelegatedPeerRouting(ipfsHttpClient.create({
  host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
  protocol: 'https',
  port: 443
}))

const delegatedContentRouting = new DelegatedContentRouting(peerId, ipfsHttpClient.create({
  host: 'node0.delegate.ipfs.io', // In production you should setup your own delegates
  protocol: 'https',
  port: 443
}))

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  contentRouting: [
    delegatedContentRouting
  ],
  peerRouting: [
    delegatedPeerRouting
  ],
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
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport, circuitRelayServer } from 'libp2p/circuit-relay'

const node = await createLibp2p({
  transports: [
    tcp(),
    circuitRelayTransport({ // allows the current node to make and accept relayed connections
      discoverRelays: 0, // how many network relays to find
      reservationConcurrency: 1 // how many relays to attempt to reserve slots on at once
    })
  ],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  connectionGater: {
    // used by the server - return true to deny a reservation to the remote peer
    denyInboundRelayReservation: (source: PeerId) => Promise<boolean>

    // used by the server - return true to deny a relay connection request from the source to the destination peer
    denyOutboundRelayedConnection: (source: PeerId, destination: PeerId) => Promise<boolean>

    // used by the client - return true to deny a relay connection from the remote relay and peer
    denyInboundRelayedConnection: (relay: PeerId, remotePeer: PeerId) => Promise<boolean>
  },
  services: {
    relay: circuitRelayServer({ // makes the node function as a relay server
      hopTimeout: 30 * 1000, // incoming relay requests must be resolved within this time limit
      advertise: { // if set, use content routing to broadcast availability of this relay
        bootDelay: 30 * 1000 // how long to wait after startup before broadcast
      },
      reservations: {
        maxReservations: 15 // how many peers are allowed to reserve relay slots on this server
        reservationClearInterval: 300 * 1000 // how often to reclaim stale reservations
        applyDefaultLimit: true // whether to apply default data/duration limits to each relayed connection
        defaultDurationLimit: 2 * 60 * 1000 // the default maximum amount of time a relayed connection can be open for
        defaultDataLimit: BigInt(2 << 7) // the default maximum number of bytes that can be transferred over a relayed connection
        maxInboundHopStreams: 32 // how many inbound HOP streams are allow simultaneously
        maxOutboundHopStreams: 64 // how many outbound HOP streams are allow simultaneously
      }
    }),
  }
})
```

#### Setup with Automatic Reservations

In this configuration the libp2p node will search the network for one relay with a free reservation slot. When it has found one and negotiated a relay reservation, the relayed address will appear in the output of `libp2p.getMultiaddrs()`.

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

const node = await createLibp2p({
  transports: [
    tcp(),
    circuitRelayTransport({
      discoverRelays: 1
    })
  ],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()]
})
```

#### Setup with Preconfigured Reservations

In this configuration the libp2p node is a circuit relay client which connects to a relay, `/ip4/123.123.123.123/p2p/QmRelay` which has been configured to have slots available.

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { circuitRelayTransport } from 'libp2p/circuit-relay'

const node = await createLibp2p({
  transports: [
    tcp(),
    circuitRelayTransport()
  ],
  addresses: {
    listen: [
      '/ip4/123.123.123.123/p2p/QmRelay/p2p-circuit' // a known relay node with reservation slots available
    ]
  },
  streamMuxers: [mplex()],
  connectionEncryption: [noise()]
})
```

#### Setup with Keychain

Libp2p allows you to setup a secure keychain to manage your keys. The keychain configuration object should have the following properties:

| Name | Type | Description |
|------|------|-------------|
| pass | `string` | Passphrase to use in the keychain (minimum of 20 characters). |
| datastore | `object` | must implement [ipfs/interface-datastore](https://github.com/ipfs/interface-datastore) |

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelDatastore } from 'datastore-level'

const datastore = new LevelDatastore('path/to/store')
await datastore.open()

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  keychain: {
    pass: 'notsafepassword123456789',
    datastore: dsInstant,
  }
})
```

#### Configuring Connection Manager

The Connection Manager manages connections to peers in libp2p.  It controls opening closing connections but also pruning connections when certain limits are exceeded. If Metrics are enabled, you can also configure the Connection Manager to monitor the bandwidth of libp2p and prune connections as needed. You can read more about what Connection Manager does at [./CONNECTION_MANAGER.md](https://libp2p.github.io/js-libp2p-interfaces/modules/_libp2p_interface_connection_manager.html). The configuration values below show the defaults for Connection Manager.

See the [API docs](https://libp2p.github.io/js-libp2p/interfaces/index._internal_.ConnectionManagerConfig.html) for a full run list and discussion of all Connection Manager options.


```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  connectionManager: {
    maxConnections: Infinity,
    minConnections: 0
  }
})
```

#### Configuring Connection Gater

The Connection Gater allows us to prevent making incoming and outgoing connections to peers and storing
multiaddrs in the address book.

The order in which methods are called is as follows:

##### Outgoing connections

1. `connectionGater.denyDialPeer(...)`
2. `connectionGater.denyDialMultiaddr(...)`
3. `connectionGater.denyOutboundConnection(...)`
4. `connectionGater.denyOutboundEncryptedConnection(...)`
5. `connectionGater.denyOutboundUpgradedConnection(...)`

##### Incoming connections

1. `connectionGater.denyInboundConnection(...)`
2. `connectionGater.denyInboundEncryptedConnection(...)`
3. `connectionGater.denyInboundUpgradedConnection(...)`

```js
const node = await createLibp2p({
  // .. other config
  connectionGater: {
    /**
     * denyDialMultiaddr tests whether we're permitted to Dial the
     * specified peer.
     *
     * This is called by the dialer.connectToPeer implementation before
     * dialling a peer.
     *
     * Return true to prevent dialing the passed peer.
     */
    denyDialPeer: (peerId: PeerId) => Promise<boolean>

    /**
     * denyDialMultiaddr tests whether we're permitted to dial the specified
     * multiaddr for the given peer.
     *
     * This is called by the dialer.connectToPeer implementation after it has
     * resolved the peer's addrs, and prior to dialling each.
     *
     * Return true to prevent dialing the passed peer on the passed multiaddr.
     */
    denyDialMultiaddr: (multiaddr: Multiaddr) => Promise<boolean>

    /**
     * denyInboundConnection tests whether an incipient inbound connection is allowed.
     *
     * This is called by the upgrader, or by the transport directly (e.g. QUIC,
     * Bluetooth), straight after it has accepted a connection from its socket.
     *
     * Return true to deny the incoming passed connection.
     */
    denyInboundConnection: (maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * denyOutboundConnection tests whether an incipient outbound connection is allowed.
     *
     * This is called by the upgrader, or by the transport directly (e.g. QUIC,
     * Bluetooth), straight after it has created a connection with its socket.
     *
     * Return true to deny the incoming passed connection.
     */
    denyOutboundConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * denyInboundEncryptedConnection tests whether a given connection, now encrypted,
     * is allowed.
     *
     * This is called by the upgrader, after it has performed the security
     * handshake, and before it negotiates the muxer, or by the directly by the
     * transport, at the exact same checkpoint.
     *
     * Return true to deny the passed secured connection.
     */
    denyInboundEncryptedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * denyOutboundEncryptedConnection tests whether a given connection, now encrypted,
     * is allowed.
     *
     * This is called by the upgrader, after it has performed the security
     * handshake, and before it negotiates the muxer, or by the directly by the
     * transport, at the exact same checkpoint.
     *
     * Return true to deny the passed secured connection.
     */
    denyOutboundEncryptedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * denyInboundUpgradedConnection tests whether a fully capable connection is allowed.
     *
     * This is called after encryption has been negotiated and the connection has been
     * multiplexed, if a multiplexer is configured.
     *
     * Return true to deny the passed upgraded connection.
     */
    denyInboundUpgradedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * denyOutboundUpgradedConnection tests whether a fully capable connection is allowed.
     *
     * This is called after encryption has been negotiated and the connection has been
     * multiplexed, if a multiplexer is configured.
     *
     * Return true to deny the passed upgraded connection.
     */
    denyOutboundUpgradedConnection: (peerId: PeerId, maConn: MultiaddrConnection) => Promise<boolean>

    /**
     * Used by the address book to filter passed addresses.
     *
     * Return true to allow storing the passed multiaddr for the passed peer.
     */
    filterMultiaddrForPeer: (peer: PeerId, multiaddr: Multiaddr) => Promise<boolean>
  }
})
```

#### Configuring Transport Manager

The Transport Manager is responsible for managing the libp2p transports life cycle. This includes starting listeners for the provided listen addresses, closing these listeners and dialing using the provided transports. By default, if a libp2p node has a list of multiaddrs for listening on and there are no valid transports for those multiaddrs, libp2p will throw an error on startup and shutdown. However, for some applications it is perfectly acceptable for libp2p nodes to start in dial only mode if all the listen multiaddrs failed. This error tolerance can be enabled as follows:

```js
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { FaultTolerance } from '@libp2p/interface-transport'

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
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
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'

const node = await createLibp2p({
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()]
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
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { LevelDatastore } from 'datastore-level'

const datastore = new LevelDatastore('path/to/store')
await datastore.open() // level database must be ready before node boot

const node = await createLibp2p({
  datastore, // pass the opened datastore
  transports: [tcp()],
  streamMuxers: [mplex()],
  connectionEncryption: [noise()],
  peerStore: {
    persistence: true,
    threshold: 5
  }
})
```

#### Customizing Transports

Some Transports can be passed additional options when they are created. For example, `libp2p-webrtc-star` accepts an optional, custom `wrtc` implementation. In addition to libp2p passing itself and an `Upgrader` to handle connection upgrading, libp2p will also pass the options, if they are provided, from `config.transport`.

```js
import { createLibp2p } from 'libp2p'
import { webRTCStar } from '@libp2p/webrtc-star'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import wrtc from 'wrtc'

const webRTC = webRTCStar({
  wrtc
})

const node = await createLibp2p({
  transports: [
    webRTC.transport
  ],
  peerDiscovery: [
    webRTC.discovery
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ]
})
```

During Libp2p startup, transport listeners will be created for the configured listen multiaddrs.  Some transports support custom listener options and you can set them using the `listenerOptions` in the transport configuration. For example, [libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star) transport listener supports the configuration of its underlying [simple-peer](https://github.com/feross/simple-peer) ice server(STUN/TURN) config as follows:

```js
const webRTC = webRTCStar({
  listenerOptions: {
    config: {
      iceServers: [
        {"urls": ["turn:YOUR.TURN.SERVER:3478"], "username": "YOUR.USER", "credential": "YOUR.PASSWORD"},
        {"urls": ["stun:YOUR.STUN.SERVER:3478"], "username": "", "credential": ""}]
    }
  }
})

const node = await createLibp2p({
  transports: [
    webRTC.transport
  ],
  peerDiscovery: [
    webRTC.discovery
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ],
  addresses: {
    listen: ['/dns4/your-wrtc-star.pub/tcp/443/wss/p2p-webrtc-star'] // your webrtc dns multiaddr
  }
})
```

#### Configuring UPnP NAT Traversal

Network Address Translation (NAT) is a function performed by your router to enable multiple devices on your local network to share a single IPv4 address. It's done transparently for outgoing connections, ensuring the correct response traffic is routed to your computer, but if you wish to accept incoming connections some configuration is necessary.

Some home routers support [UPnP NAT](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) which allows network devices to request traffic to be forwarded from public facing ports that would otherwise be firewalled.

If your router supports this, libp2p can be configured to use it as follows:

```js
import { createLibp2p } from 'libp2p'
import { uPnPNAT } from 'libp2p/upnp-nat'

const node = await createLibp2p({
  services: {
    nat: uPnPNAT({
      description: 'my-node', // set as the port mapping description on the router, defaults the current libp2p version and your peer id
      gateway: '192.168.1.1', // leave unset to auto-discover
      externalIp: '80.1.1.1', // leave unset to auto-discover
      localAddress: '129.168.1.123', // leave unset to auto-discover
      ttl: 7200, // TTL for port mappings (min 20 minutes)
      keepAlive: true, // Refresh port mapping after TTL expires
    })
  }
})
```

##### Browser support

Browsers cannot open TCP ports or send the UDP datagrams necessary to configure external port mapping - to accept incoming connections in the browser please use a WebRTC transport.

##### UPnP and NAT-PMP

By default under nodejs libp2p will attempt to use [UPnP](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) to configure your router to allow incoming connections to any TCP transports that have been configured.

[NAT-PMP](http://miniupnp.free.fr/nat-pmp.html) is a feature of some modern routers which performs a similar job to UPnP. NAT-PMP is disabled by default, if enabled libp2p will try to use NAT-PMP and will fall back to UPnP if it fails.

#### Configuring protocol name

Changing the protocol name prefix can isolate default public network (IPFS) for custom purposes.

```js
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { pingService } from 'libp2p/ping'

const node = await createLibp2p({
  services: {
    identify: identifyService({
      protocolPrefix: 'ipfs' // default
    }),
    ping: pingService({
      protocolPrefix: 'ipfs' // default
    })
  }
})
/*
protocols: [
  "/ipfs/id/1.0.0", // identify service protocol (if we have multiplexers)
  "/ipfs/id/push/1.0.0", // identify service push protocol (if we have multiplexers)
  "/ipfs/ping/1.0.0", // built-in ping protocol
]
*/
```

## Configuration examples

As libp2p is designed to be a modular networking library, its usage will vary based on individual project needs. We've included links to some existing project configurations for your reference, in case you wish to replicate their configuration:

- [libp2p-ipfs-nodejs](https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-core-config/src/libp2p.js) - libp2p configuration used by js-ipfs when running in Node.js
- [libp2p-ipfs-browser](https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-core-config/src/libp2p.browser.js) - libp2p configuration used by js-ipfs when running in a Browser (that supports WebRTC)

If you have developed a project using `js-libp2p`, please consider submitting your configuration to this list so that it can be found easily by other users.

The [examples](../examples) are also a good source of help for finding a configuration that suits your needs.

## Limits

Configuring the various limits of your node is important to protect it when it is part of hostile of adversarial networks. See [LIMITS.md](./LIMITS.md) for a full breakdown of the various built in protections and safeguards.
