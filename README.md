<h1 align="center">
  <a href="libp2p.io"><img width="250" src="https://github.com/libp2p/libp2p/blob/master/logo/black-bg-2.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the libp2p Networking Stack.</h3>

<p align="center">
  <a href="http://ipn.io"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23libp2p"><img src="https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square" /></a>
  <a href="https://waffle.io/libp2p/libp2p"><img src="https://img.shields.io/badge/pm-waffle-yellow.svg?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://ci.ipfs.team/job/libp2p/job/js-libp2p/job/master/"><img src="https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p/master" /></a>
  <a href="https://codecov.io/gh/libp2p/js-libp2p"><img src="https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg"></a>
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

**Want to get started?** Check our [examples folder](/examples). You can check the development status at the [Waffle Board](https://waffle.io/libp2p/js-libp2p).

[![Throughput Graph](https://graphs.waffle.io/libp2p/js-libp2p/throughput.svg)](https://waffle.io/libp2p/js-libp2p/metrics/throughput)

[**`Weekly Core Dev Calls`**](https://github.com/ipfs/pm/issues/650)

## Tech Lead

[David Dias](https://github.com/diasdavid/)

## Lead Maintainer

[David Dias](https://github.com/diasdavid/)

## Table of Contents

- [Background](#background)
- [Bundles](#bundles)
- [Usage](#usage)
  - [Install](#install)
  - [Usage](#usage)
  - [API](#api)
- [Development](#development)
  - [Tests](#tests)
  - [Packages](#packages)
- [Contribute](#contribute)
- [License](#license)

## Background

libp2p is the product of a long and arduous quest to understand the evolution of the Internet networking stack. In order to build P2P applications, devs have long had to made custom ad-hoc solutions to fit their needs, sometimes making some hard assumptions about their runtimes and the state of the network at the time of their development. Today, looking back more than 20 years, we see a clear pattern in the types of mechanisms built around the Internet Protocol, IP, which can be found throughout many layers of the OSI layer system, libp2p distils these mechanisms into flat categories and defines clear interfaces that once exposed, enable other protocols and applications to use and swap them, enabling upgradability and adaptability for the runtime, without breaking the API.

We are in the process of writing better documentation, blog posts, tutorials and a formal specification. Today you can find:

- [libp2p.io](https://libp2p.io)
- [Specification (WIP)](https://github.com/libp2p/specs)
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

### [Tutorials and Examples](/examples)

You can find multiple examples on the [examples folder](/examples) that will guide you through using libp2p for several scenarios.

### Extending libp2p skeleton

libp2p becomes very simple and basically acts as a glue for every module that compose this library. Since it can be highly customized, it requires some setup. What we recommend is to have a libp2p build for the system you are developing taking into account in your needs (e.g. for a browser working version of libp2p that acts as the network layer of IPFS, we have a built and minified version that browsers can require).

**Example:**

```JavaScript
// Creating a bundle that adds:
//   transport: websockets + tcp
//   stream-muxing: spdy & mplex
//   crypto-channel: secio
//   discovery: multicast-dns

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const SPDY = require('libp2p-spdy')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const defaultsDeep = require('@nodeutils/defaults-deep')
const Protector = require('libp2p-pnet')

class Node extends libp2p {
  constructor (_peerInfo, _peerBook, _options) {
    const defaults = {
      peerInfo: _peerInfo,            // The Identity of your Peer
      peerBook: _peerBook,            // Where peers get tracked, if undefined libp2p will create one instance

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
        connProtector: new Protector(/*protector specific opts*/),
        peerDiscovery: [
          MulticastDNS
        ],
        peerRouting: {},              // Currently both peerRouting and contentRouting are patched through the DHT,
        contentRouting: {},           // this will change once we factor that into two modules, for now do the following line:
        dht: DHT                      // DHT enables PeerRouting, ContentRouting and DHT itself components
      },

      // libp2p config options (typically found on a config.json)
      config: {                       // The config object is the part of the config that can go into a file, config.json.
        peerDiscovery: {
          mdns: {                     // mdns options
            interval: 1000            // ms
            enabled: true
          },
          webrtcStar: {               // webrtc-star options
            interval: 1000            // ms
            enabled: false
          }
          // .. other discovery module options.
        },
        peerRouting: {},
        contentRouting: {},
        relay: {                      // Circuit Relay options
          enabled: false,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          kBucketSize: 20
        },
        // Enable/Disable Experimental features
        EXPERIMENTAL: {               // Experimental features ("behind a flag")
          pubsub: false,
          dht: false
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

#### Create a Node - `new libp2p.Node([peerInfo, peerBook, options])`

> Creates an instance of the libp2p.Node.

- `peerInfo`: instance of [PeerInfo][] that contains the [PeerId][], Keys and [multiaddrs][multiaddr] of the libp2p Node. Optional.
- `peerBook`: instance of [PeerBook][] that contains the [PeerInfo][] of known peers. Optional.
- `options`: Object containing custom options for the bundle.

#### `libp2p.start(callback)`

> Start the libp2p Node.

`callback` is a function with the following `function (err) {}` signature, where `err` is an Error in case starting the node fails.

#### `libp2p.stop(callback)`

> Stop the libp2p Node.

`callback` is a function with the following `function (err) {}` signature, where `err` is an Error in case stopping the node fails.

#### `libp2p.dial(peer, callback)`

> Dials to another peer in the network, establishes the connection.

- `peer`: can be an instance of [PeerInfo][], [PeerId][], [multiaddr][], or a multiaddr string
- `callback`: Function with signature `function (err, conn) {}` where `conn` is a [Connection](https://github.com/libp2p/interface-connection) object

`callback` is a function with the following `function (err, conn) {}` signature, where `err` is an Error in of failure to dial the connection and `conn` is a [Connection][] instance in case of a protocol selected, if not it is undefined.

#### `libp2p.dialProtocol(peer, protocol, callback)`

> Dials to another peer in the network and selects a protocol to talk with that peer.

- `peer`: can be an instance of [PeerInfo][], [PeerId][], [multiaddr][], or a multiaddr string
- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `callback`: Function with signature `function (err, conn) {}` where `conn` is a [Connection](https://github.com/libp2p/interface-connection) object

`callback` is a function with the following `function (err, conn) {}` signature, where `err` is an Error in of failure to dial the connection and `conn` is a [Connection][] instance in case of a protocol selected, if not it is undefined.

#### `libp2p.hangUp(peer, callback)`

> Closes an open connection with a peer, graciously.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]

`callback` is a function with the following `function (err) {}` signature, where `err` is an Error in case stopping the node fails.

#### `libp2p.peerRouting.findPeer(id, callback)`

> Looks up for multiaddrs of a peer in the DHT

- `id`: instance of [PeerId][]

#### `libp2p.contentRouting.findProviders(key, timeout, callback)`

- `key`: Buffer
- `timeout`: Number miliseconds

#### `libp2p.contentRouting.provide(key, callback)`

- `key`: Buffer


#### `libp2p.handle(protocol, handlerFunc [, matchFunc])`

> Handle new protocol

- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')
- `handlerFunc`: Function with signature `function (protocol, conn) {}` where `conn` is a [Connection](https://github.com/libp2p/interface-connection) object
- `matchFunc`: Function for matching on protocol (exact matching, semver, etc). Default to exact match.

#### `libp2p.unhandle(protocol)`

> Stop handling protocol

- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0')

#### `libp2p.on('peer:discovery', (peer) => {})`

> Peer has been discovered.

- `peer`: instance of [PeerInfo][]

#### `libp2p.on('peer:connect', (peer) => {})`

> We connected to a new peer

- `peer`: instance of [PeerInfo][]

#### `libp2p.on('peer:disconnect', (peer) => {})`

> We disconnected from Peer

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

#### `libp2p.dht.get(key, callback)`

- `key`: Buffer

#### `libp2p.dht.getMany(key, nVals, callback)`

- `key`: Buffer
- `nVals`: Number

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

#### Run interop tests

```sh
N/A
```

#### Run benchmark tests

```sh
N/A
```

### Packages

List of packages currently in existence for libp2p

| Package | Version | Deps | CI | Coverage |
| ---------|---------|---------|---------|--------- |
| **Libp2p** |
| [`interface-libp2p`](//github.com/libp2p/interface-libp2p) | [![npm](https://img.shields.io/npm/v/interface-libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/interface-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/interface-libp2p) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-libp2p/master)](https://ci.ipfs.team/job/libp2p/job/interface-libp2p/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-libp2p/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-libp2p) |
| [`libp2p`](//github.com/libp2p/js-libp2p) | [![npm](https://img.shields.io/npm/v/libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p) |
| **Connection** |
| [`interface-connection`](//github.com/libp2p/interface-connection) | [![npm](https://img.shields.io/npm/v/interface-connection.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-connection/releases) | [![Deps](https://david-dm.org/libp2p/interface-connection.svg?style=flat-square)](https://david-dm.org/libp2p/interface-connection) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-connection/master)](https://ci.ipfs.team/job/libp2p/job/interface-connection/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-connection/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-connection) |
| **Transport** |
| [`interface-transport`](//github.com/libp2p/interface-transport) | [![npm](https://img.shields.io/npm/v/interface-transport.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-transport/releases) | [![Deps](https://david-dm.org/libp2p/interface-transport.svg?style=flat-square)](https://david-dm.org/libp2p/interface-transport) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-transport/master)](https://ci.ipfs.team/job/libp2p/job/interface-transport/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-transport/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-transport) |
| [`libp2p-circuit`](//github.com/libp2p/js-libp2p-circuit) | [![npm](https://img.shields.io/npm/v/libp2p-circuit.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-circuit/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-circuit.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-circuit) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-circuit/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-circuit/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-circuit/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-circuit) |
| [`libp2p-tcp`](//github.com/libp2p/js-libp2p-tcp) | [![npm](https://img.shields.io/npm/v/libp2p-tcp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-tcp/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-tcp/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-tcp/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-tcp) |
| [`libp2p-udp`](//github.com/libp2p/js-libp2p-udp) | [![npm](https://img.shields.io/npm/v/libp2p-udp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-udp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-udp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-udp) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-udp/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-udp/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-udp/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-udp) |
| [`libp2p-udt`](//github.com/libp2p/js-libp2p-udt) | [![npm](https://img.shields.io/npm/v/libp2p-udt.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-udt/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-udt.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-udt) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-udt/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-udt/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-udt/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-udt) |
| [`libp2p-utp`](//github.com/libp2p/js-libp2p-utp) | [![npm](https://img.shields.io/npm/v/libp2p-utp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-utp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-utp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utp) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-utp/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-utp/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-utp/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-utp) |
| [`libp2p-webrtc-direct`](//github.com/libp2p/js-libp2p-webrtc-direct) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-direct.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-direct/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-direct.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-direct) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-webrtc-direct/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-webrtc-direct/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-webrtc-star/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-webrtc-star/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) |
| [`libp2p-websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-websockets/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-websockets/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websockets/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websockets) |
| [`libp2p-websocket-star`](//github.com/libp2p/js-libp2p-websocket-star) | [![npm](https://img.shields.io/npm/v/libp2p-websocket-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websocket-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-websocket-star/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-websocket-star/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websocket-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star) |
| [`libp2p-websocket-star-rendezvous`](//github.com/libp2p/js-libp2p-websocket-star-rendezvous) | [![npm](https://img.shields.io/npm/v/libp2p-websocket-star-rendezvous.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websocket-star-rendezvous/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websocket-star-rendezvous.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star-rendezvous) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-websocket-star-rendezvous/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-websocket-star-rendezvous/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websocket-star-rendezvous/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star-rendezvous) |
| **Crypto Channels** |
| [`libp2p-secio`](//github.com/libp2p/js-libp2p-secio) | [![npm](https://img.shields.io/npm/v/libp2p-secio.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-secio/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-secio.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-secio/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-secio/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-secio/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-secio) |
| **Stream Muxers** |
| [`interface-stream-muxer`](//github.com/libp2p/interface-stream-muxer) | [![npm](https://img.shields.io/npm/v/interface-stream-muxer.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-stream-muxer/releases) | [![Deps](https://david-dm.org/libp2p/interface-stream-muxer.svg?style=flat-square)](https://david-dm.org/libp2p/interface-stream-muxer) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-stream-muxer/master)](https://ci.ipfs.team/job/libp2p/job/interface-stream-muxer/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-stream-muxer/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-stream-muxer) |
| [`libp2p-mplex`](//github.com/libp2p/js-libp2p-mplex) | [![npm](https://img.shields.io/npm/v/libp2p-mplex.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mplex) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-mplex/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-mplex/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mplex/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-mplex) |
| [`libp2p-spdy`](//github.com/libp2p/js-libp2p-spdy) | [![npm](https://img.shields.io/npm/v/libp2p-spdy.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-spdy/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-spdy.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-spdy) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-spdy/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-spdy/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-spdy/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-spdy) |
| **Discovery** |
| [`interface-peer-discovery`](//github.com/libp2p/interface-peer-discovery) | [![npm](https://img.shields.io/npm/v/interface-peer-discovery.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-peer-discovery/releases) | [![Deps](https://david-dm.org/libp2p/interface-peer-discovery.svg?style=flat-square)](https://david-dm.org/libp2p/interface-peer-discovery) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-peer-discovery/master)](https://ci.ipfs.team/job/libp2p/job/interface-peer-discovery/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-peer-discovery/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-peer-discovery) |
| [`libp2p-bootstrap`](//github.com/libp2p/js-libp2p-bootstrap) | [![npm](https://img.shields.io/npm/v/libp2p-bootstrap.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-bootstrap) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-bootstrap/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-bootstrap/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-bootstrap/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-kad-dht/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-kad-dht/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| [`libp2p-mdns`](//github.com/libp2p/js-libp2p-mdns) | [![npm](https://img.shields.io/npm/v/libp2p-mdns.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-mdns/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-mdns/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mdns/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-mdns) |
| [`libp2p-rendezvous`](//github.com/libp2p/js-libp2p-rendezvous) | [![npm](https://img.shields.io/npm/v/libp2p-rendezvous.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-rendezvous/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-rendezvous.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-rendezvous) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-rendezvous/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-rendezvous/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-rendezvous/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-rendezvous) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-webrtc-star/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-webrtc-star/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) |
| [`libp2p-websocket-star`](//github.com/libp2p/js-libp2p-websocket-star) | [![npm](https://img.shields.io/npm/v/libp2p-websocket-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websocket-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-websocket-star/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-websocket-star/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websocket-star/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star) |
| **NAT Traversal** |
| [`libp2p-circuit`](//github.com/libp2p/js-libp2p-circuit) | [![npm](https://img.shields.io/npm/v/libp2p-circuit.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-circuit/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-circuit.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-circuit) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-circuit/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-circuit/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-circuit/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-circuit) |
| [`libp2p-nat-mngr`](//github.com/libp2p/js-libp2p-nat-mngr) | [![npm](https://img.shields.io/npm/v/libp2p-nat-mngr.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-nat-mngr/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-nat-mngr.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-nat-mngr) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-nat-mngr/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-nat-mngr/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-nat-mngr/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-nat-mngr) |
| **Data Types** |
| [`peer-book`](//github.com/libp2p/js-peer-book) | [![npm](https://img.shields.io/npm/v/peer-book.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-book/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-book.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-peer-book/master)](https://ci.ipfs.team/job/libp2p/job/js-peer-book/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-peer-book/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-book) |
| [`peer-id`](//github.com/libp2p/js-peer-id) | [![npm](https://img.shields.io/npm/v/peer-id.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-id/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-id.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-id) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-peer-id/master)](https://ci.ipfs.team/job/libp2p/job/js-peer-id/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-peer-id/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-id) |
| [`peer-info`](//github.com/libp2p/js-peer-info) | [![npm](https://img.shields.io/npm/v/peer-info.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-info/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-info.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-info) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-peer-info/master)](https://ci.ipfs.team/job/libp2p/job/js-peer-info/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-peer-info/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-peer-info) |
| **Content Routing** |
| [`interface-content-routing`](//github.com/libp2p/interface-content-routing) | [![npm](https://img.shields.io/npm/v/interface-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/interface-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/interface-content-routing) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-content-routing/master)](https://ci.ipfs.team/job/libp2p/job/interface-content-routing/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-content-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-content-routing) |
| [`libp2p-delegated-content-routing`](//github.com/libp2p/js-libp2p-delegated-content-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-delegated-content-routing/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-delegated-content-routing/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-kad-dht/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-kad-dht/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| **Peer Routing** |
| [`interface-peer-routing`](//github.com/libp2p/interface-peer-routing) | [![npm](https://img.shields.io/npm/v/interface-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/interface-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/interface-peer-routing) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-peer-routing/master)](https://ci.ipfs.team/job/libp2p/job/interface-peer-routing/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-peer-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-peer-routing) |
| [`libp2p-delegated-peer-routing`](//github.com/libp2p/js-libp2p-delegated-peer-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-delegated-peer-routing/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-delegated-peer-routing/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-kad-dht/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-kad-dht/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| **Record Store** |
| [`interface-record-store`](//github.com/libp2p/interface-record-store) | [![npm](https://img.shields.io/npm/v/interface-record-store.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-record-store/releases) | [![Deps](https://david-dm.org/libp2p/interface-record-store.svg?style=flat-square)](https://david-dm.org/libp2p/interface-record-store) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/interface-record-store/master)](https://ci.ipfs.team/job/libp2p/job/interface-record-store/job/master/) | [![codecov](https://codecov.io/gh/libp2p/interface-record-store/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/interface-record-store) |
| [`libp2p-record`](//github.com/libp2p/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/libp2p-record.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-record/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-record.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-record) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-record/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-record/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-record/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-record) |
| **Generics** |
| [`libp2p-connection-manager`](//github.com/libp2p/js-libp2p-connection-manager) | [![npm](https://img.shields.io/npm/v/libp2p-connection-manager.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-connection-manager/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-connection-manager.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-connection-manager) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-connection-manager/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-connection-manager/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-connection-manager/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-connection-manager) |
| [`libp2p-crypto`](//github.com/libp2p/js-libp2p-crypto) | [![npm](https://img.shields.io/npm/v/libp2p-crypto.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-crypto/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-crypto/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-crypto) |
| [`libp2p-crypto-secp256k1`](//github.com/libp2p/js-libp2p-crypto-secp256k1) | [![npm](https://img.shields.io/npm/v/libp2p-crypto-secp256k1.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto-secp256k1/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto-secp256k1.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto-secp256k1) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-crypto-secp256k1/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-crypto-secp256k1/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto-secp256k1/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-crypto-secp256k1) |
| [`libp2p-switch`](//github.com/libp2p/js-libp2p-switch) | [![npm](https://img.shields.io/npm/v/libp2p-switch.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-switch/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-switch.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-switch) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-switch/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-switch/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-switch/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-switch) |
| **Extensions** |
| [`libp2p-floodsub`](//github.com/libp2p/js-libp2p-floodsub) | [![npm](https://img.shields.io/npm/v/libp2p-floodsub.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-floodsub/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-floodsub/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-floodsub/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-floodsub) |
| [`libp2p-identify`](//github.com/libp2p/js-libp2p-identify) | [![npm](https://img.shields.io/npm/v/libp2p-identify.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-identify/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-identify.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-identify) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-identify/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-identify/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-identify/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-identify) |
| [`libp2p-keychain`](//github.com/libp2p/js-libp2p-keychain) | [![npm](https://img.shields.io/npm/v/libp2p-keychain.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-keychain/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-keychain.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-keychain) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-keychain/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-keychain/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-keychain/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-keychain) |
| [`libp2p-ping`](//github.com/libp2p/js-libp2p-ping) | [![npm](https://img.shields.io/npm/v/libp2p-ping.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-ping/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-ping.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-ping) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-ping/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-ping/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-ping/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-ping) |
| [`libp2p-pnet`](//github.com/libp2p/js-libp2p-pnet) | [![npm](https://img.shields.io/npm/v/libp2p-pnet.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-pnet/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-pnet.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-pnet) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-libp2p-pnet/master)](https://ci.ipfs.team/job/libp2p/job/js-libp2p-pnet/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-pnet/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-libp2p-pnet) |
| **Utilities** |
| [`p2pcat`](//github.com/libp2p/js-p2pcat) | [![npm](https://img.shields.io/npm/v/p2pcat.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-p2pcat/releases) | [![Deps](https://david-dm.org/libp2p/js-p2pcat.svg?style=flat-square)](https://david-dm.org/libp2p/js-p2pcat) | [![jenkins](https://ci.ipfs.team/buildStatus/icon?job=libp2p/js-p2pcat/master)](https://ci.ipfs.team/job/libp2p/job/js-p2pcat/job/master/) | [![codecov](https://codecov.io/gh/libp2p/js-p2pcat/branch/master/graph/badge.svg)](https://codecov.io/gh/libp2p/js-p2pcat) |

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

## License

[MIT](LICENSE) © David Dias
