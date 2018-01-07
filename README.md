<h1 align="center">
  <a href="libp2p.io"><img width="250" src="https://github.com/libp2p/libp2p/blob/master/logo/alternates/libp2p-logo-alt-2.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the libp2p Networking Stack.</h3>

<p align="center">
  <a href="http://ipn.io"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-blue.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23ipfs"><img src="https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square" /></a>
  <a href="https://waffle.io/libp2p/libp2p"><img src="https://img.shields.io/badge/pm-waffle-blue.svg?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://travis-ci.org/libp2p/js-libp2p"><img src="https://travis-ci.org/libp2p/js-libp2p.svg?branch=master" /></a>
  <a href="https://circleci.com/gh/libp2p/js-libp2p"><img src="https://circleci.com/gh/libp2p/js-libp2p.svg?style=svg" /></a>
  <a href="https://coveralls.io/github/libp2p/js-libp2p?branch=master"><img src="https://coveralls.io/repos/github/libp2p/js-libp2p/badge.svg?branch=master"></a>
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
//   stream-muxing: SPDY
//   crypto-channel: secio
//   discovery: multicast-dns

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const WS = require('libp2p-websockets')
const spdy = require('libp2p-spdy')
const secio = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')

class Node extends libp2p {
  constructor (peerInfo, peerBook, options) {
    options = options || {}

    const modules = {
      transport: [
        new TCP(),
        new WS()
      ],
      connection: {
        muxer: [
          spdy
        ],
        crypto: [
          secio
        ]
      },
      discovery: [
        new MulticastDNS(peerInfo)
      ],
      // DHT is passed as its own enabling PeerRouting, ContentRouting and DHT itself components
      dht: DHT
    }

    super(modules, peerInfo, peerBook, options)
  }
}

// Now all the nodes you create, will have TCP, WebSockets, SPDY, SECIO and MulticastDNS support.
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

#### `libp2p.dial(peer [, protocol, callback])`

> Dials to another peer in the network.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
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

---------------------

`DHT methods exposed`

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

| Package | Version | Dependencies | DevDependencies |
|---------|---------|--------------|-----------------|
| **Transports**                                     |
| [`libp2p-utp`](//github.com/libp2p/js-libp2p-utp) | [![npm](https://img.shields.io/npm/v/libp2p-utp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-utp/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-utp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utp) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-utp/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utp?type=dev) |
| [`libp2p-websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-websockets/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets?type=dev) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-webrtc-star/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star?type=dev) |
| **Connection Upgrades**                            |
| [`interface-connection`](//github.com/libp2p/interface-connection) | [![npm](https://img.shields.io/npm/v/interface-connection.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-connection/releases) | [![Dependency Status](https://david-dm.org/libp2p/interface-connection.svg?style=flat-square)](https://david-dm.org/libp2p/interface-connection) | [![devDependency Status](https://david-dm.org/libp2p/interface-connection/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/interface-connection?type=dev) |
| **Stream Muxers**                                  |
| [`interface-stream-muxer`](//github.com/libp2p/interface-stream-muxer) | [![npm](https://img.shields.io/npm/v/interface-stream-muxer.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-stream-muxer/releases) | [![Dependency Status](https://david-dm.org/libp2p/interface-stream-muxer.svg?style=flat-square)](https://david-dm.org/libp2p/interface-stream-muxer) | [![devDependency Status](https://david-dm.org/libp2p/interface-stream-muxer/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/interface-stream-muxer?type=dev) |
| [`libp2p-spdy`](//github.com/libp2p/js-libp2p-spdy) | [![npm](https://img.shields.io/npm/v/libp2p-spdy.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-spdy/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-spdy.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-spdy) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-spdy/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-spdy?type=dev) |
| [`libp2p-multiplex`](https://github.com/libp2p/js-libp2p-multiplex)
| **Discovery**                                       |
| [`libp2p-mdns-discovery`](//github.com/libp2p/js-libp2p-mdns-discovery) | [![npm](https://img.shields.io/npm/v/libp2p-mdns-discovery.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns-discovery/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-mdns-discovery.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns-discovery) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-mdns-discovery/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns-discovery?type=dev) |
| [`libp2p-railing`](//github.com/libp2p/js-libp2p-railing) | [![npm](https://img.shields.io/npm/v/libp2p-railing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-railing/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-railing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-railing) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-railing/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-railing?type=dev) |
| **Crypto Channels**                                |
| [`libp2p-secio`](//github.com/libp2p/js-libp2p-secio) | [![npm](https://img.shields.io/npm/v/libp2p-secio.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-secio/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-secio.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-secio/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio?type=dev) |
| **Peer Routing**                                     |
| [`libp2p-kad-routing`](//github.com/libp2p/js-libp2p-kad-routing) | [![npm](https://img.shields.io/npm/v/libp2p-kad-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-routing/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-kad-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-routing) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-kad-routing/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-routing?type=dev) |
| **Content Routing**                                |
| [`interface-record-store`](//github.com/libp2p/interface-record-store) | [![npm](https://img.shields.io/npm/v/interface-record-store.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interface-record-store/releases) | [![Dependency Status](https://david-dm.org/libp2p/interface-record-store.svg?style=flat-square)](https://david-dm.org/libp2p/interface-record-store) | [![devDependency Status](https://david-dm.org/libp2p/interface-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/interface-record-store?type=dev) |
| [`libp2p-record`](//github.com/libp2p/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/libp2p-record.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-record/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-record.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-record) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-record/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-record?type=dev) |
| [`libp2p-distributed-record-store`](//github.com/libp2p/js-libp2p-distributed-record-store) | [![npm](https://img.shields.io/npm/v/undefined.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-distributed-record-store/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-distributed-record-store.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-distributed-record-store) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-distributed-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-distributed-record-store?type=dev) |
| [`libp2p-kad-record-store`](//github.com/libp2p/js-libp2p-kad-record-store) | [![npm](https://img.shields.io/npm/v/libp2p-kad-record-store.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-record-store/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-kad-record-store.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-record-store) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-kad-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-record-store?type=dev) |
| **Generics**                                        |
| [`libp2p-swarm`](//github.com/libp2p/js-libp2p-swarm) | [![npm](https://img.shields.io/npm/v/libp2p-swarm.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-swarm/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-swarm.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-swarm) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-swarm/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-swarm?type=dev) |
| [`libp2p-ping`](//github.com/libp2p/js-libp2p-ping) | [![npm](https://img.shields.io/npm/v/libp2p-ping.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-ping/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-ping.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-ping) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-ping/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-ping?type=dev) |
| [`multistream-select`](//github.com/libp2p/js-multistream) | [![npm](https://img.shields.io/npm/v/multistream-select.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-multistream/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-multistream.svg?style=flat-square)](https://david-dm.org/libp2p/js-multistream) | [![devDependency Status](https://david-dm.org/libp2p/js-multistream/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-multistream?type=dev) |
| **Data Types**                                      |
| [`peer-book`](//github.com/libp2p/js-peer-book) | [![npm](https://img.shields.io/npm/v/peer-book.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-book/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-peer-book.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book) | [![devDependency Status](https://david-dm.org/libp2p/js-peer-book/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book?type=dev) |
| [`peer-id`](https://github.com/libp2p/js-peer-id)

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

## License

[MIT](LICENSE) © David Dias
