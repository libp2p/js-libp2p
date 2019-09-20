<h1 align="center">
  <a href="libp2p.io"><img width="250" src="https://github.com/libp2p/libp2p/blob/master/logo/black-bg-2.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the libp2p Networking Stack.</h3>

<p align="center">
  <a href="http://ipn.io"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23libp2p"><img src="https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square" /></a>
  <a href="https://riot.permaweb.io/#/room/#libp2p:permaweb.io"><img src="https://img.shields.io/badge/matrix-%23libp2p%3Apermaweb.io-blue.svg?style=flat-square" /> </a>
  <a href="https://discord.gg/66KBrm2"><img src="https://img.shields.io/discord/475789330380488707?color=blueviolet&label=discord&style=flat-square" /></a>
  <a href="https://discuss.libp2p.io"><img src="https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg" /></a>
</p>

<p align="center">
  <a href="https://travis-ci.com/libp2p/js-libp2p"><img src="https://flat.badgen.net/travis/libp2p/js-libp2p" /></a>
  <a href="https://codecov.io/gh/libp2p/js-libp2p"><img src="https://img.shields.io/codecov/c/github/ipfs/js-ipfs-multipart/master.svg?style=flat-square"></a>
  <a href="https://bundlephobia.com/result?p=ipfsd-ctl"><img src="https://flat.badgen.net/bundlephobia/minzip/ipfsd-ctl"></a>
  <br>
  <a href="https://david-dm.org/libp2p/js-libp2p"><img src="https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square" /></a>
  <a href="https://github.com/feross/standard"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"></a>
  <a href="https://github.com/RichardLitt/standard-readme"><img src="https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square" /></a>
  <br>
</p>

### Project status

We've come a long way, but this project is still in Alpha, lots of development is happening, API might change, beware of the Dragons 🐉..

**Want to get started?** Check our [examples folder](/examples).

[**`Weekly Core Dev Calls`**](https://github.com/ipfs/pm/issues/650)

## Tech Lead

[David Dias](https://github.com/diasdavid/)

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun/)

## Table of Contents

- [Background](#background)
- [Bundles](#bundles)
- [Usage](#usage)
  - [Install](#install)
  - [Usage](#usage)
  - [API](#api)
    - [Events](#events)
- [Development](#development)
  - [Tests](#tests)
  - [Packages](#packages)
- [Contribute](#contribute)
- [License](#license)

## Background

libp2p is the product of a long and arduous quest to understand the evolution of the Internet networking stack. In order to build P2P applications, devs have long had to made custom ad-hoc solutions to fit their needs, sometimes making some hard assumptions about their runtimes and the state of the network at the time of their development. Today, looking back more than 20 years, we see a clear pattern in the types of mechanisms built around the Internet Protocol, IP, which can be found throughout many layers of the OSI layer system, libp2p distils these mechanisms into flat categories and defines clear interfaces that once exposed, enable other protocols and applications to use and swap them, enabling upgradability and adaptability for the runtime, without breaking the API.

We are in the process of writing better documentation, blog posts, tutorials and a formal specification. Today you can find:

- [libp2p.io](https://libp2p.io)
- [docs.libp2p.io](https://docs.libp2p.io)
- [Specification (WIP)](https://github.com/libp2p/specs)
- [Discussion Forums](https://discuss.libp2p.io)
- Talks
  - [`libp2p <3 ethereum` at DEVCON2](https://ethereumfoundation.org/devcon/?session=libp2p) [📼 video](https://www.youtube.com/watch?v=HxueJbeMVG4) [slides](https://ethereumfoundation.org/devcon/wp-content/uploads/2016/10/libp2p-HEART-devp2p-IPFS-PLUS-Ethereum-networking.pdf) [📼 demo-1](https://ethereumfoundation.org/devcon/wp-content/uploads/2016/10/libp2p_demo1-1.mp4) [📼 demo-2](https://ethereumfoundation.org/devcon/wp-content/uploads/2016/10/libp2p_demo2-1.mp4)
- Articles
  - [The overview of libp2p](https://github.com/libp2p/libp2p#description)

To sum up, libp2p is a "network stack" -- a protocol suite -- that cleanly separates concerns, and enables sophisticated applications to only use the protocols they absolutely need, without giving up interoperability and upgradeability. libp2p grew out of IPFS, but it is built so that lots of people can use it, for lots of different projects.

## Bundles

With its modular nature, libp2p can be found being used in different projects with different sets of features, while preserving the same top level API. `js-libp2p` is only a skeleton and should not be installed directly, if you are looking for a prebundled libp2p stack, please check:

- [libp2p-ipfs-nodejs](https://github.com/ipfs/js-ipfs/tree/master/src/core/runtime/libp2p-nodejs.js) - The libp2p build used by js-ipfs when run in Node.js
- [libp2p-ipfs-browser](https://github.com/ipfs/js-ipfs/tree/master/src/core/runtime/libp2p-browser.js) - The libp2p build used by js-ipfs when run in a Browser (that supports WebRTC)

If you have developed a libp2p bundle, please consider submitting it to this list so that it can be found easily by the users of libp2p.

## Install

Again, as noted above, this module is only a skeleton and should not be used directly other than libp2p bundle implementors that want to extend its code.

```sh
npm install --save libp2p
```

## Usage

**IMPORTANT NOTE**: We are currently on the way of migrating all our `libp2p` modules to use `async await` and `async iterators`, instead of callbacks and `pull-streams`. As a consequence, when you start a new libp2p project, we must check which versions of the modules you should use. For now, it is required to use the modules using callbacks with `libp2p`, while we are working on getting the remaining modules ready for a full migration. For more details, you can have a look at [libp2p/js-libp2p#266](https://github.com/libp2p/js-libp2p/issues/266).

### [Tutorials and Examples](/examples)

You can find multiple examples on the [examples folder](/examples) that will guide you through using libp2p for several scenarios.

### Creating your own libp2p bundle

The libp2p module acts as a glue for every libp2p module that you can use to create your own libp2p bundle. Creating your own libp2p bundle gives you a lot of freedom when it comes to customize it with features and default setup. We recommend creating your own libp2p bundle for the app you are developing that takes in account your needs (e.g. for a browser working version of libp2p that acts as the network layer of IPFS, we have a built one that leverages the Browser transports).

**Example:**

```JavaScript
// Creating a bundle that adds:
//   transport: websockets + tcp
//   stream-muxing: spdy & mplex
//   crypto-channel: secio
//   discovery: multicast-dns

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const SPDY = require('libp2p-spdy')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const defaultsDeep = require('@nodeutils/defaults-deep')
const Protector = require('libp2p-pnet')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')

class Node extends Libp2p {
  constructor (_options) {
    const peerInfo = _options.peerInfo
    const defaults = {
      // The libp2p modules for this libp2p bundle
      modules: {
        transport: [
          TCP,
          new WS()                    // It can take instances too!
        ],
        streamMuxer: [
          SPDY,
          MPLEX
        ],
        connEncryption: [
          SECIO
        ],
        /** Encryption for private networks. Needs additional private key to work **/
        // connProtector: new Protector(/*protector specific opts*/),
        /** Enable custom content routers, such as delegated routing **/
        // contentRouting: [
        //   new DelegatedContentRouter(peerInfo.id)
        // ],
        /** Enable custom peer routers, such as delegated routing **/
        // peerRouting: [
        //   new DelegatedPeerRouter()
        // ],
        peerDiscovery: [
          MulticastDNS
        ],
        dht: DHT,                      // DHT enables PeerRouting, ContentRouting and DHT itself components
        pubsub: GossipSub
      },

      // libp2p config options (typically found on a config.json)
      config: {                       // The config object is the part of the config that can go into a file, config.json.
        peerDiscovery: {
          autoDial: true,             // Auto connect to discovered peers (limited by ConnectionManager minPeers)
          mdns: {                     // mdns options
            interval: 1000,           // ms
            enabled: true
          },
          webrtcStar: {               // webrtc-star options
            interval: 1000,           // ms
            enabled: false
          }
          // .. other discovery module options.
        },
        relay: {                      // Circuit Relay options
          enabled: true,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          kBucketSize: 20,
          enabled: true,
          randomWalk: {
            enabled: true,      // Allows to disable discovery (enabled by default)
            interval: 300e3,
            timeout: 10e3
          }
        },
        pubsub: {
          enabled: true,
          emitSelf: true,      // whether the node should emit to self on publish, in the event of the topic being subscribed
          signMessages: true,  // if messages should be signed
          strictSigning: true  // if message signing should be required
        }
      }
    }

    // overload any defaults of your bundle using https://github.com/nodeutils/defaults-deep
    super(defaultsDeep(_options, defaults))
  }
}

// Now all the nodes you create, will have TCP, WebSockets, SPDY, MPLEX, SECIO and MulticastDNS support.
```

### API

**IMPORTANT NOTE**: All the methods listed in the API section that take a callback are also now Promisified. Libp2p is migrating away from callbacks to async/await, and in a future release (that will be announced in advance), callback support will be removed entirely. You can follow progress of the async/await endeavor at https://github.com/ipfs/js-ipfs/issues/1670.

#### Create a Node - `Libp2p.createLibp2p(options, callback)`

> Behaves exactly like `new Libp2p(options)`, but doesn't require a PeerInfo. One will be generated instead

```js
const { createLibp2p } = require('libp2p')
createLibp2p(options, (err, libp2p) => {
  if (err) throw err
  libp2p.start((err) => {
    if (err) throw err
  })
})
```

- `options`: Object of libp2p configuration options
- `callback`: Function with signature `function (Error, Libp2p) {}`

#### Create a Node alternative - `new Libp2p(options)`

> Creates an instance of Libp2p with a custom `PeerInfo` provided via `options.peerInfo`.

Required keys in the `options` object:

- `peerInfo`: instance of [PeerInfo][] that contains the [PeerId][], Keys and [multiaddrs][multiaddr] of the libp2p Node.
- `modules.transport`: An array that must include at least 1 transport, such as `libp2p-tcp`.

#### `libp2p.start(callback)`

> Start the libp2p Node.

`callback` following signature `function (err) {}`, where `err` is an Error in case starting the node fails.

#### `libp2p.stop(callback)`

> Stop the libp2p Node.

`callback` following signature `function (err) {}`, where `err` is an Error in case stopping the node fails.

#### `libp2p.dial(peer, callback)`

> Dials to another peer in the network, establishes the connection.

- `peer`: can be an instance of [PeerInfo][], [PeerId][], [multiaddr][], or a multiaddr string
- `callback` following signature `function (err, conn) {}`, where `err` is an Error in of failure to dial the connection and `conn` is a [Connection][] instance in case of a protocol selected, if not it is undefined.

#### `libp2p.dialProtocol(peer, protocol, callback)`

> Dials to another peer in the network and selects a protocol to talk with that peer.

- `peer`: can be an instance of [PeerInfo][], [PeerId][], [multiaddr][], or a multiaddr string
- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `callback`: Function with signature `function (err, conn) {}`, where `conn` is a [Connection](https://github.com/libp2p/interface-connection) object

`callback` following signature `function (err, conn) {}`, where `err` is an Error in of failure to dial the connection and `conn` is a [Connection][] instance in case of a protocol selected, if not it is undefined.

#### `libp2p.dialFSM(peer, protocol, callback)`

> Behaves like `.dial` and `.dialProtocol` but calls back with a Connection State Machine

- `peer`: can be an instance of [PeerInfo][], [PeerId][], [multiaddr][], or a multiaddr string
- `protocol`: an optional String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `callback`: following signature `function (err, connFSM) {}`, where `connFSM` is a [Connection State Machine](https://github.com/libp2p/js-libp2p-switch#connection-state-machine)

#### `libp2p.hangUp(peer, callback)`

> Closes an open connection with a peer, graciously.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]

`callback` following signature `function (err) {}`, where `err` is an Error in case stopping the node fails.

#### `libp2p.peerRouting.findPeer(id, options, callback)`

> Looks up for multiaddrs of a peer in the DHT

- `id`: instance of [PeerId][]
- `options`: object of options
- `options.maxTimeout`: Number milliseconds

#### `libp2p.contentRouting.findProviders(key, options, callback)`

- `key`: Buffer
- `options`: object of options
- `options.maxTimeout`: Number milliseconds
- `options.maxNumProviders` maximum number of providers to find

#### `libp2p.contentRouting.provide(key, callback)`

- `key`: Buffer

#### `libp2p.handle(protocol, handlerFunc [, matchFunc])`

> Handle new protocol

- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `handlerFunc`: following signature `function (protocol, conn) {}`, where `conn` is a [Connection](https://github.com/libp2p/interface-connection) object
- `matchFunc`: Function for matching on protocol (exact matching, semver, etc). Default to exact match.

#### `libp2p.unhandle(protocol)`

> Stop handling protocol

- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')

#### Events

##### `libp2p.on('start', () => {})`

> Libp2p has started, along with all its services.

##### `libp2p.on('stop', () => {})`

> Libp2p has stopped, along with all its services.

##### `libp2p.on('error', (err) => {})`

> An error has occurred

- `err`: instance of `Error`

##### `libp2p.on('peer:discovery', (peer) => {})`

> Peer has been discovered.

If `autoDial` is `true`, applications should **not** attempt to connect to the peer
unless they are performing a specific action. See [peer discovery and auto dial](./PEER_DISCOVERY.md) for more information.

- `peer`: instance of [PeerInfo][]

##### `libp2p.on('peer:connect', (peer) => {})`

> We have a new muxed connection to a peer

- `peer`: instance of [PeerInfo][]

##### `libp2p.on('peer:disconnect', (peer) => {})`

> We have closed a connection to a peer

- `peer`: instance of [PeerInfo][]

##### `libp2p.on('connection:start', (peer) => {})`

> We created a new connection to a peer

- `peer`: instance of [PeerInfo][]

##### `libp2p.on('connection:end', (peer) => {})`

> We closed a connection to a peer

- `peer`: instance of [PeerInfo][]

#### `libp2p.isStarted()`

> Check if libp2p is started

#### `libp2p.ping(peer [, options], callback)`

> Ping a node in the network

#### `libp2p.peerBook`

> PeerBook instance of the node

#### `libp2p.peerInfo`

> PeerInfo instance of the node

#### `libp2p.pubsub`

> Same API as IPFS PubSub, defined in the [CORE API Spec](https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/PUBSUB.md). Just replace `ipfs` by `libp2p` and you are golden.

---------------------

`DHT methods also exposed for the time being`

#### `libp2p.dht.put(key, value, callback)`

- `key`: Buffer
- `value`: Buffer

#### `libp2p.dht.get(key, options, callback)`

- `key`: Buffer
- `options`: object of options
- `options.maxTimeout`: Number milliseconds

#### `libp2p.dht.getMany(key, nVals, options, callback)`

- `key`: Buffer
- `nVals`: Number
- `options`: object of options
- `options.maxTimeout`: Number milliseconds

[PeerInfo]: https://github.com/libp2p/js-peer-info
[PeerId]: https://github.com/libp2p/js-peer-id
[PeerBook]: https://github.com/libp2p/js-peer-book
[multiaddr]: https://github.com/multiformats/js-multiaddr
[Connection]: https://github.com/libp2p/interface-connection

-------

### Switch Stats API

##### `libp2p.stats.emit('update')`

Every time any stat value changes, this object emits an `update` event.

#### Global stats

##### `libp2p.stats.global.snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number

##### `libp2p.stats.global.movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-transport stats

##### `libp2p.stats.transports()`

Returns an array containing the tags (string) for each observed transport.

##### `libp2p.stats.forTransport(transportTag).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number

##### `libp2p.stats.forTransport(transportTag).movingAverages`

Returns an object containing the following keys:

 dataSent
 dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-protocol stats

##### `libp2p.stats.protocols()`

Returns an array containing the tags (string) for each observed protocol.

##### `libp2p.stats.forProtocol(protocolTag).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number


##### `libp2p.stats.forProtocol(protocolTag).movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-peer stats

##### `libp2p.stats.peers()`

Returns an array containing the peerIDs (B58-encoded string) for each observed peer.

##### `libp2p.stats.forPeer(peerId:String).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number


##### `libp2p.stats.forPeer(peerId:String).movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Stats update interval

Stats are not updated in real-time. Instead, measurements are buffered and stats are updated at an interval. The maximum interval can be defined through the `Switch` constructor option `stats.computeThrottleTimeout`, defined in miliseconds.

### Private Networks

#### Enforcement

Libp2p provides support for connection protection, such as for private networks. You can enforce network protection by setting the environment variable `LIBP2P_FORCE_PNET=1`. When this variable is on, if no protector is set via `options.connProtector`, Libp2p will throw an error upon creation.

#### Protectors

Some available network protectors:
* [libp2p-pnet](https://github.com/libp2p/js-libp2p-pnet)

## Development

**Clone and install dependencies:**

```sh
> git clone https://github.com/ipfs/js-ipfs.git
> cd js-ipfs
> npm install
```

### Tests

#### Run unit tests

```sh
# run all the unit tsts
> npm test

# run just Node.js tests
> npm run test:node

# run just Browser tests (Chrome)
> npm run test:browser
```

### Packages

List of packages currently in existence for libp2p

> This table is generated using the module `package-table` with `package-table --data=package-list.json`.

| Package | Version | Deps | CI | Coverage | Lead Maintainer |
| ---------|---------|---------|---------|---------|--------- |
| **Libp2p** |
| [`interface-libp2p`](//github.com/libp2p/interface-libp2p) | [![npm](https://img.shields.io/npm/v/interface-libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/interface-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/interface-libp2p) | [![Travis CI](https://travis-ci.com/libp2p/interface-libp2p.svg?branch=master)](https://travis-ci.com/libp2p/interface-libp2p) | [![codecov](https://codecov.io/gh/libp2p/interface-libp2p/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-libp2p) | N/A |
| [`libp2p`](//github.com/libp2p/js-libp2p) | [![npm](https://img.shields.io/npm/v/libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **Connection** |
| [`interface-connection`](//github.com/libp2p/interface-connection) | [![npm](https://img.shields.io/npm/v/interface-connection.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-connection/releases) | [![Deps](https://david-dm.org/libp2p/interface-connection.svg?style=flat-square)](https://david-dm.org/libp2p/interface-connection) | [![Travis CI](https://travis-ci.com/libp2p/interface-connection.svg?branch=master)](https://travis-ci.com/libp2p/interface-connection) | [![codecov](https://codecov.io/gh/libp2p/interface-connection/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-connection) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **Transport** |
| [`interface-transport`](//github.com/libp2p/interface-transport) | [![npm](https://img.shields.io/npm/v/interface-transport.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-transport/releases) | [![Deps](https://david-dm.org/libp2p/interface-transport.svg?style=flat-square)](https://david-dm.org/libp2p/interface-transport) | [![Travis CI](https://travis-ci.com/libp2p/interface-transport.svg?branch=master)](https://travis-ci.com/libp2p/interface-transport) | [![codecov](https://codecov.io/gh/libp2p/interface-transport/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-transport) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-tcp`](//github.com/libp2p/js-libp2p-tcp) | [![npm](https://img.shields.io/npm/v/libp2p-tcp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-tcp.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-tcp) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-tcp/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-tcp) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-utp`](//github.com/libp2p/js-libp2p-utp) | [![npm](https://img.shields.io/npm/v/libp2p-utp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-utp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-utp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utp) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-utp.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-utp) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-utp/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-utp) | N/A |
| [`libp2p-webrtc-direct`](//github.com/libp2p/js-libp2p-webrtc-direct) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-direct.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-direct/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-direct.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-direct) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-webrtc-direct.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-direct) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-webrtc-star.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-websockets.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-websockets) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websockets/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websockets) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-websocket-star`](//github.com/libp2p/js-libp2p-websocket-star) | [![npm](https://img.shields.io/npm/v/libp2p-websocket-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websocket-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-websocket-star.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-websocket-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websocket-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **Crypto Channels** |
| [`libp2p-secio`](//github.com/libp2p/js-libp2p-secio) | [![npm](https://img.shields.io/npm/v/libp2p-secio.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-secio/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-secio.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-secio.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-secio) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-secio/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-secio) | [Friedel Ziegelmayer](mailto:dignifiedquire@gmail.com) |
| **Stream Muxers** |
| [`interface-stream-muxer`](//github.com/libp2p/interface-stream-muxer) | [![npm](https://img.shields.io/npm/v/interface-stream-muxer.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-stream-muxer/releases) | [![Deps](https://david-dm.org/libp2p/interface-stream-muxer.svg?style=flat-square)](https://david-dm.org/libp2p/interface-stream-muxer) | [![Travis CI](https://travis-ci.com/libp2p/interface-stream-muxer.svg?branch=master)](https://travis-ci.com/libp2p/interface-stream-muxer) | [![codecov](https://codecov.io/gh/libp2p/interface-stream-muxer/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-stream-muxer) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-mplex`](//github.com/libp2p/js-libp2p-mplex) | [![npm](https://img.shields.io/npm/v/libp2p-mplex.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mplex) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-mplex.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-mplex) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mplex/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-mplex) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-spdy`](//github.com/libp2p/js-libp2p-spdy) | [![npm](https://img.shields.io/npm/v/libp2p-spdy.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-spdy/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-spdy.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-spdy) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-spdy.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-spdy) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-spdy/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-spdy) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **Discovery** |
| [`interface-peer-discovery`](//github.com/libp2p/interface-peer-discovery) | [![npm](https://img.shields.io/npm/v/interface-peer-discovery.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-peer-discovery/releases) | [![Deps](https://david-dm.org/libp2p/interface-peer-discovery.svg?style=flat-square)](https://david-dm.org/libp2p/interface-peer-discovery) | [![Travis CI](https://travis-ci.com/libp2p/interface-peer-discovery.svg?branch=master)](https://travis-ci.com/libp2p/interface-peer-discovery) | [![codecov](https://codecov.io/gh/libp2p/interface-peer-discovery/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-peer-discovery) | N/A |
| [`libp2p-bootstrap`](//github.com/libp2p/js-libp2p-bootstrap) | [![npm](https://img.shields.io/npm/v/libp2p-bootstrap.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-bootstrap) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-bootstrap.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-bootstrap) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-bootstrap/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-kad-dht.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-mdns`](//github.com/libp2p/js-libp2p-mdns) | [![npm](https://img.shields.io/npm/v/libp2p-mdns.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-mdns.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-mdns) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mdns/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-mdns) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-rendezvous`](//github.com/libp2p/js-libp2p-rendezvous) | [![npm](https://img.shields.io/npm/v/libp2p-rendezvous.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-rendezvous/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-rendezvous.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-rendezvous) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-rendezvous.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-rendezvous) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-rendezvous/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-rendezvous) | N/A |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-webrtc-star.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-websocket-star`](//github.com/libp2p/js-libp2p-websocket-star) | [![npm](https://img.shields.io/npm/v/libp2p-websocket-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websocket-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-websocket-star.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-websocket-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websocket-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **Content Routing** |
| [`interface-content-routing`](//github.com/libp2p/interface-content-routing) | [![npm](https://img.shields.io/npm/v/interface-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/interface-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/interface-content-routing) | [![Travis CI](https://travis-ci.com/libp2p/interface-content-routing.svg?branch=master)](https://travis-ci.com/libp2p/interface-content-routing) | [![codecov](https://codecov.io/gh/libp2p/interface-content-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-content-routing) | N/A |
| [`libp2p-delegated-content-routing`](//github.com/libp2p/js-libp2p-delegated-content-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-delegated-content-routing.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-delegated-content-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-kad-dht.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **Peer Routing** |
| [`interface-peer-routing`](//github.com/libp2p/interface-peer-routing) | [![npm](https://img.shields.io/npm/v/interface-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/interface-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/interface-peer-routing) | [![Travis CI](https://travis-ci.com/libp2p/interface-peer-routing.svg?branch=master)](https://travis-ci.com/libp2p/interface-peer-routing) | [![codecov](https://codecov.io/gh/libp2p/interface-peer-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-peer-routing) | N/A |
| [`libp2p-delegated-peer-routing`](//github.com/libp2p/js-libp2p-delegated-peer-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-delegated-peer-routing.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-delegated-peer-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-kad-dht.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **Utilities** |
| [`libp2p-crypto`](//github.com/libp2p/js-libp2p-crypto) | [![npm](https://img.shields.io/npm/v/libp2p-crypto.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-crypto.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-crypto) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-crypto) | [Friedel Ziegelmayer](mailto:dignifiedquire@gmail.com) |
| [`libp2p-crypto-secp256k1`](//github.com/libp2p/js-libp2p-crypto-secp256k1) | [![npm](https://img.shields.io/npm/v/libp2p-crypto-secp256k1.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto-secp256k1/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto-secp256k1.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto-secp256k1) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-crypto-secp256k1.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-crypto-secp256k1) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto-secp256k1/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-crypto-secp256k1) | [Friedel Ziegelmayer](mailto:dignifiedquire@gmail.com) |
| **Data Types** |
| [`peer-book`](//github.com/libp2p/js-peer-book) | [![npm](https://img.shields.io/npm/v/peer-book.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-book/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-book.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book) | [![Travis CI](https://travis-ci.com/libp2p/js-peer-book.svg?branch=master)](https://travis-ci.com/libp2p/js-peer-book) | [![codecov](https://codecov.io/gh/libp2p/js-peer-book/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-book) | [Pedro Teixeira](mailto:i@pgte.me) |
| [`peer-id`](//github.com/libp2p/js-peer-id) | [![npm](https://img.shields.io/npm/v/peer-id.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-id/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-id.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-id) | [![Travis CI](https://travis-ci.com/libp2p/js-peer-id.svg?branch=master)](https://travis-ci.com/libp2p/js-peer-id) | [![codecov](https://codecov.io/gh/libp2p/js-peer-id/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-id) | [Pedro Teixeira](mailto:i@pgte.me) |
| [`peer-info`](//github.com/libp2p/js-peer-info) | [![npm](https://img.shields.io/npm/v/peer-info.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-info/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-info.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-info) | [![Travis CI](https://travis-ci.com/libp2p/js-peer-info.svg?branch=master)](https://travis-ci.com/libp2p/js-peer-info) | [![codecov](https://codecov.io/gh/libp2p/js-peer-info/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-info) | [Pedro Teixeira](mailto:i@pgte.me) |
| **Extensions** |
| [`libp2p-floodsub`](//github.com/libp2p/js-libp2p-floodsub) | [![npm](https://img.shields.io/npm/v/libp2p-floodsub.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) | [![Travis CI](https://travis-ci.com/libp2p/js-libp2p-floodsub.svg?branch=master)](https://travis-ci.com/libp2p/js-libp2p-floodsub) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-floodsub/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-floodsub) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

## License

[MIT](LICENSE) © Protocol Labs
