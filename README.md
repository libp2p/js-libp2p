<h1 align="center">
  <a href="libp2p.io"><img width="250" src="https://github.com/libp2p/libp2p/blob/master/logo/black-bg-2.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the libp2p Networking Stack.</h3>

<p align="center">
  <a href="http://protocol.ai"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23libp2p"><img src="https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square" /></a>
  <a href="https://riot.im/app/#/room/#libp2p:matrix.org"><img src="https://img.shields.io/badge/matrix-%23libp2p%3Apermaweb.io-blue.svg?style=flat-square" /> </a>
  <a href="https://discord.gg/66KBrm2"><img src="https://img.shields.io/discord/475789330380488707?color=blueviolet&label=discord&style=flat-square" /></a>
  <a href="https://discuss.libp2p.io"><img src="https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg" /></a>
  <a href="https://www.npmjs.com/package/libp2p"><img src="https://img.shields.io/npm/dm/libp2p.svg" /></a>
  <a href="https://www.jsdelivr.com/package/npm/libp2p"><img src="https://data.jsdelivr.com/v1/package/npm/libp2p/badge"/></a>
</p>

<p align="center">
  <a href="https://github.com/libp2p/js-libp2p/actions?query=branch%3Amaster+workflow%3Aci+"><img src="https://img.shields.io/github/workflow/status/libp2p/js-libp2p/ci?label=ci&style=flat-square" /></a>
  <a href="https://codecov.io/gh/libp2p/js-libp2p"><img src="https://img.shields.io/codecov/c/github/libp2p/js-libp2p/master.svg?style=flat-square"></a>
  <a href="https://bundlephobia.com/result?p=ipfsd-ctl"><img src="https://flat.badgen.net/bundlephobia/minzip/ipfsd-ctl"></a>
  <br>
  <a href="https://david-dm.org/libp2p/js-libp2p"><img src="https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square" /></a>
  <a href="https://github.com/feross/standard"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"></a>
  <a href="https://github.com/RichardLitt/standard-readme"><img src="https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/npm-%3E%3D7.0.0-orange.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/Node.js-%3E%3D15.0.0-orange.svg?style=flat-square" /></a>
  <br>
</p>

### Project status

We've come a long way, but this project is still in Alpha, lots of development is happening, API might change, beware of the Dragons 🐉..

The documentation in the master branch may contain changes from a pre-release.
If you are looking for the documentation of the latest release, you can view the latest release on [**npm**](https://www.npmjs.com/package/libp2p), or select the tag in github that matches the version you are looking for.

**Want to get started?** Check our [GETTING_STARTED.md](./doc/GETTING_STARTED.md) guide and [examples folder](/examples).

**Want to update libp2p in your project?** Check our [migrations folder](./doc/migrations).

## Table of Contents <!-- omit in toc -->

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [API](#api)
  - [Getting started](#getting-started)
  - [Tutorials and Examples](#tutorials-and-examples)
- [Development](#development)
  - [Tests](#tests)
    - [Run unit tests](#run-unit-tests)
  - [Packages](#packages)
- [Contribute](#contribute)
- [License](#license)
  - [Contribution](#contribution)

## Background

libp2p is the product of a long and arduous quest to understand the evolution of the Internet networking stack. In order to build P2P applications, devs have long had to make custom ad-hoc solutions to fit their needs, sometimes making some hard assumptions about their runtimes and the state of the network at the time of their development. Today, looking back more than 20 years, we see a clear pattern in the types of mechanisms built around the Internet Protocol, IP, which can be found throughout many layers of the OSI layer system, libp2p distils these mechanisms into flat categories and defines clear interfaces that once exposed, enable other protocols and applications to use and swap them, enabling upgradability and adaptability for the runtime, without breaking the API.

We are in the process of writing better documentation, blog posts, tutorials and a formal specification. Today you can find:

- [libp2p.io](https://libp2p.io)
- [docs.libp2p.io](https://docs.libp2p.io)
- [Specification (WIP)](https://github.com/libp2p/specs)
- [Discussion Forums](https://discuss.libp2p.io)
- Talks
  - [`libp2p <3 ethereum` at DEVCON2](https://archive.devcon.org/archive/watch/2/libp2p-devp2p-ipfs-and-ethereum-networking/)
- Articles
  - [The overview of libp2p](https://github.com/libp2p/libp2p#description)

To sum up, libp2p is a "network stack" -- a protocol suite -- that cleanly separates concerns, and enables sophisticated applications to only use the protocols they absolutely need, without giving up interoperability and upgradeability. libp2p grew out of IPFS, but it is built so that lots of people can use it, for lots of different projects.

## Install

```sh
npm install libp2p
```

## Usage

### Configuration

For all the information on how you can configure libp2p see [CONFIGURATION.md](./doc/CONFIGURATION.md).

### API

The specification is available on [API.md](./doc/API.md).

### Getting started

If you are starting your journey with `js-libp2p`, read the [GETTING_STARTED.md](./doc/GETTING_STARTED.md) guide.

### Tutorials and Examples

You can find multiple examples on the [examples folder](./examples) that will guide you through using libp2p for several scenarios.

## Development

**Clone and install dependencies:**

```sh
> git clone https://github.com/libp2p/js-libp2p.git
> cd js-libp2p
> npm install
> npm run build
```

### Tests

#### Run unit tests

```sh
# run all the unit tsts
> npm test

# run just Node.js tests
> npm run test:node

# run just Browser tests (Chrome)
> npm run test:chrome
```

### Packages

List of packages currently in existence for libp2p

> This table is generated using the module `package-table` with `package-table --data=package-list.json`.

| Package | Version | Deps | CI | Coverage | Lead Maintainer |
| ---------|---------|---------|---------|---------|--------- |
| **libp2p** |
| [`libp2p`](//github.com/libp2p/js-libp2p) | [![npm](https://img.shields.io/npm/v/libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p/master)](https://travis-ci.com/libp2p/js-libp2p) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-daemon`](//github.com/libp2p/js-libp2p-daemon) | [![npm](https://img.shields.io/npm/v/libp2p-daemon.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-daemon/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-daemon.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-daemon) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-daemon/master)](https://travis-ci.com/libp2p/js-libp2p-daemon) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-daemon/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-daemon-client`](//github.com/libp2p/js-libp2p-daemon-client) | [![npm](https://img.shields.io/npm/v/libp2p-daemon-client.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-daemon-client/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-daemon-client.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-daemon-client) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-daemon-client/master)](https://travis-ci.com/libp2p/js-libp2p-daemon-client) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-daemon-client/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon-client) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| [`libp2p-interfaces`](//github.com/libp2p/js-interfaces) | [![npm](https://img.shields.io/npm/v/libp2p-interfaces.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-interfaces/releases) | [![Deps](https://david-dm.org/libp2p/js-interfaces.svg?style=flat-square)](https://david-dm.org/libp2p/js-interfaces) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-interfaces/master)](https://travis-ci.com/libp2p/js-interfaces) | [![codecov](https://codecov.io/gh/libp2p/js-interfaces/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-interfaces) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`interop-libp2p`](//github.com/libp2p/interop) | [![npm](https://img.shields.io/npm/v/interop-libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interop/releases) | [![Deps](https://david-dm.org/libp2p/interop.svg?style=flat-square)](https://david-dm.org/libp2p/interop) | [![Travis CI](https://flat.badgen.net/travis/libp2p/interop/master)](https://travis-ci.com/libp2p/interop) | [![codecov](https://codecov.io/gh/libp2p/interop/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/interop) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| **transports** |
| [`libp2p-tcp`](//github.com/libp2p/js-libp2p-tcp) | [![npm](https://img.shields.io/npm/v/libp2p-tcp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-tcp/master)](https://travis-ci.com/libp2p/js-libp2p-tcp) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-tcp/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-webrtc-direct`](//github.com/libp2p/js-libp2p-webrtc-direct) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-direct.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-direct/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-direct.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-direct) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-direct/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-direct) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-star/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-websockets/master)](https://travis-ci.com/libp2p/js-libp2p-websockets) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websockets/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websockets) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **secure channels** |
| [`libp2p-noise`](//github.com/NodeFactoryIo/js-libp2p-noise) | [![npm](https://img.shields.io/npm/v/libp2p-noise.svg?maxAge=86400&style=flat-square)](//github.com/NodeFactoryIo/js-libp2p-noise/releases) | [![Deps](https://david-dm.org/NodeFactoryIo/js-libp2p-noise.svg?style=flat-square)](https://david-dm.org/NodeFactoryIo/js-libp2p-noise) | [![Travis CI](https://flat.badgen.net/travis/NodeFactoryIo/js-libp2p-noise/master)](https://travis-ci.com/NodeFactoryIo/js-libp2p-noise) | [![codecov](https://codecov.io/gh/NodeFactoryIo/js-libp2p-noise/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/NodeFactoryIo/js-libp2p-noise) | N/A |
| **stream multiplexers** |
| [`libp2p-mplex`](//github.com/libp2p/js-libp2p-mplex) | [![npm](https://img.shields.io/npm/v/libp2p-mplex.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mplex) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-mplex/master)](https://travis-ci.com/libp2p/js-libp2p-mplex) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mplex/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mplex) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **peer discovery** |
| [`libp2p-bootstrap`](//github.com/libp2p/js-libp2p-bootstrap) | [![npm](https://img.shields.io/npm/v/libp2p-bootstrap.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-bootstrap) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-bootstrap/master)](https://travis-ci.com/libp2p/js-libp2p-bootstrap) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-bootstrap/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-mdns`](//github.com/libp2p/js-libp2p-mdns) | [![npm](https://img.shields.io/npm/v/libp2p-mdns.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-mdns/master)](https://travis-ci.com/libp2p/js-libp2p-mdns) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mdns/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-star/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`@chainsafe/discv5`](//github.com/ChainSafe/discv5) | [![npm](https://img.shields.io/npm/v/@chainsafe/discv5.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/discv5/releases) | [![Deps](https://david-dm.org/ChainSafe/discv5.svg?style=flat-square)](https://david-dm.org/ChainSafe/discv5) | [![Travis CI](https://flat.badgen.net/travis/ChainSafe/discv5/master)](https://travis-ci.com/ChainSafe/discv5) | [![codecov](https://codecov.io/gh/ChainSafe/discv5/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/discv5) | [Cayman Nava](mailto:caymannava@gmail.com) |
| **content routing** |
| [`libp2p-delegated-content-routing`](//github.com/libp2p/js-libp2p-delegated-content-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-delegated-content-routing/master)](https://travis-ci.com/libp2p/js-libp2p-delegated-content-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **peer routing** |
| [`libp2p-delegated-peer-routing`](//github.com/libp2p/js-libp2p-delegated-peer-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-delegated-peer-routing/master)](https://travis-ci.com/libp2p/js-libp2p-delegated-peer-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **utilities** |
| [`libp2p-crypto`](//github.com/libp2p/js-libp2p-crypto) | [![npm](https://img.shields.io/npm/v/libp2p-crypto.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-crypto/master)](https://travis-ci.com/libp2p/js-libp2p-crypto) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-crypto) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **data types** |
| [`peer-id`](//github.com/libp2p/js-peer-id) | [![npm](https://img.shields.io/npm/v/peer-id.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-id/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-id.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-id) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-peer-id/master)](https://travis-ci.com/libp2p/js-peer-id) | [![codecov](https://codecov.io/gh/libp2p/js-peer-id/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-peer-id) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| [`libp2p-record`](//github.com/libp2p/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/libp2p-record.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-record/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-record.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-record) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-record/master)](https://travis-ci.com/libp2p/js-libp2p-record) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-record/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-record) | [Jacob Heun](mailto:santos.vasco10@gmail.com) |
| **pubsub** |
| [`libp2p-floodsub`](//github.com/libp2p/js-libp2p-floodsub) | [![npm](https://img.shields.io/npm/v/libp2p-floodsub.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-floodsub/master)](https://travis-ci.com/libp2p/js-libp2p-floodsub) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-floodsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-floodsub) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-gossipsub`](//github.com/ChainSafe/js-libp2p-gossipsub) | [![npm](https://img.shields.io/npm/v/libp2p-gossipsub.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/js-libp2p-gossipsub/releases) | [![Deps](https://david-dm.org/ChainSafe/js-libp2p-gossipsub.svg?style=flat-square)](https://david-dm.org/ChainSafe/js-libp2p-gossipsub) | [![Travis CI](https://flat.badgen.net/travis/ChainSafe/js-libp2p-gossipsub/master)](https://travis-ci.com/ChainSafe/js-libp2p-gossipsub) | [![codecov](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub) | [Cayman Nava](mailto:caymannava@gmail.com) |
| **extensions** |
| [`libp2p-nat-mgnr`](//github.com/libp2p/js-libp2p-nat-mgnr) | [![npm](https://img.shields.io/npm/v/libp2p-nat-mgnr.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-nat-mgnr/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-nat-mgnr.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-nat-mgnr) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-nat-mgnr/master)](https://travis-ci.com/libp2p/js-libp2p-nat-mgnr) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-nat-mgnr/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-nat-mgnr) | N/A |
| [`libp2p-utils`](//github.com/libp2p/js-libp2p-utils) | [![npm](https://img.shields.io/npm/v/libp2p-utils.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-utils/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-utils.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utils) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-utils/master)](https://travis-ci.com/libp2p/js-libp2p-utils) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-utils/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utils) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
