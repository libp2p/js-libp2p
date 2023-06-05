<h1 align="center">
  <a href="https://libp2p.io"><img width="250" src="https://github.com/libp2p/js-libp2p/blob/master/img/libp2p.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">The JavaScript implementation of the libp2p Networking Stack.</h3>

<p align="center">
  <a href="http://protocol.ai"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23libp2p"><img src="https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square" /></a>
  <a href="https://riot.im/app/#/room/#libp2p:matrix.org"><img src="https://img.shields.io/badge/matrix-%23libp2p%3Apermaweb.io-blue.svg?style=flat-square" /> </a>
  <a href="https://discord.gg/ipfs"><img src="https://img.shields.io/discord/806902334369824788?color=blueviolet&label=discord&style=flat-square" /></a>
  <a href="https://discuss.libp2p.io"><img src="https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg" /></a>
  <a href="https://www.npmjs.com/package/libp2p"><img src="https://img.shields.io/npm/dm/libp2p.svg" /></a>
  <a href="https://www.jsdelivr.com/package/npm/libp2p"><img src="https://data.jsdelivr.com/v1/package/npm/libp2p/badge"/></a>
</p>

<p align="center">
  <a href="https://github.com/libp2p/js-libp2p/actions?query=branch%3Amaster+workflow%3Aci+"><img src="https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master&label=ci&style=flat-square" /></a>
  <a href="https://codecov.io/gh/libp2p/js-libp2p"><img src="https://img.shields.io/codecov/c/github/libp2p/js-libp2p/master.svg?style=flat-square"></a>
  <br>
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
- [Roadmap](#roadmap)
- [Install](#install)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Limits](#limits)
  - [API Docs](#api-docs)
  - [Getting started](#getting-started)
  - [Tutorials and Examples](#tutorials-and-examples)
- [Development](#development)
  - [Tests](#tests)
    - [Run unit tests](#run-unit-tests)
  - [Packages](#packages)
- [Used by](#used-by)
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

## Roadmap

The js-libp2p roadmap can be found here: https://github.com/libp2p/js-libp2p/blob/master/ROADMAP.md

It represents current projects the js-libp2p maintainers are focused on and provides an estimation of completion targets.

It is complementary to the overarching libp2p project roadmap: https://github.com/libp2p/specs/blob/master/ROADMAP.md

## Install

```sh
npm install libp2p
```

## Usage

### Configuration

For all the information on how you can configure libp2p see [CONFIGURATION.md](./doc/CONFIGURATION.md).

### Limits

For help configuring your node to resist malicious network peers, see [LIMITS.md](./doc/LIMITS.md)

### API Docs

- <https://libp2p.github.io/js-libp2p>

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

| Package | Version | Deps | CI | Coverage |
| ---------|---------|---------|---------|--------- |
| **libp2p** |
| [`libp2p`](//github.com/libp2p/js-libp2p) | [![npm](https://img.shields.io/npm/v/libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/libp2p?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/libp2p) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p) |
| [`@libp2p/interface-libp2p`](//github.com/libp2p/js-libp2p-interfaces) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Finterface-libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-interfaces/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Finterface-libp2p?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Finterface-libp2p) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-interfaces/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-interfaces/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-interfaces/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-interfaces) |
| **transports** |
| [`@libp2p/tcp`](//github.com/libp2p/js-libp2p-tcp) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Ftcp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Ftcp?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Ftcp) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-tcp/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-tcp/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp) |
| [`@libp2p/webrtc`](//github.com/libp2p/js-libp2p-webrtc) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fwebrtc.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fwebrtc?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fwebrtc) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-webrtc/js-test-and-release.yml?branch=main&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc/actions?query=branch%3Amain+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc) |
| [`@libp2p/websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fwebsockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fwebsockets?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fwebsockets) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-websockets/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websockets/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websockets) |
| [`@libp2p/webtransport`](//github.com/libp2p/js-libp2p-webtransport) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fwebtransport.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webtransport/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fwebtransport?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fwebtransport) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-webtransport/js-test-and-release.yml?branch=main&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-webtransport/actions?query=branch%3Amain+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webtransport/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webtransport) |
| **secure channels** |
| [`@chainsafe/libp2p-noise`](//github.com/ChainSafe/js-libp2p-noise) | [![npm](https://img.shields.io/npm/v/%40chainsafe%2Flibp2p-noise.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/js-libp2p-noise/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40chainsafe%2Flibp2p-noise?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40chainsafe%2Flibp2p-noise) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/ChainSafe/js-libp2p-noise/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/ChainSafe/js-libp2p-noise/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/ChainSafe/js-libp2p-noise/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-noise) |
| **stream multiplexers** |
| [`@libp2p/mplex`](//github.com/libp2p/js-libp2p-mplex) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fmplex.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fmplex?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fmplex) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-mplex/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mplex/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mplex) |
| [`@chainsafe/libp2p-yamux`](//github.com/ChainSafe/js-libp2p-yamux) | [![npm](https://img.shields.io/npm/v/%40chainsafe%2Flibp2p-yamux.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/js-libp2p-yamux/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40chainsafe%2Flibp2p-yamux?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40chainsafe%2Flibp2p-yamux) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/ChainSafe/js-libp2p-yamux/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/ChainSafe/js-libp2p-yamux/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/ChainSafe/js-libp2p-yamux/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-yamux) |
| **peer discovery** |
| [`@libp2p/bootstrap`](//github.com/libp2p/js-libp2p-bootstrap) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fbootstrap.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fbootstrap?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fbootstrap) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-bootstrap/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-bootstrap/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap) |
| [`@libp2p/kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fkad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fkad-dht?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fkad-dht) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-kad-dht/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| [`@libp2p/mdns`](//github.com/libp2p/js-libp2p-mdns) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fmdns.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fmdns?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fmdns) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-mdns/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mdns/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns) |
| [`@chainsafe/discv5`](//github.com/ChainSafe/discv5) | [![npm](https://img.shields.io/npm/v/%40chainsafe%2Fdiscv5.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/discv5/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40chainsafe%2Fdiscv5?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40chainsafe%2Fdiscv5) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/ChainSafe/discv5/test_and_release.yml?branch=master&label=ci&style=flat-square)](//github.com/ChainSafe/discv5/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/ChainSafe/discv5/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/discv5) |
| **content routing** |
| [`@libp2p/reframe-content-routing`](//github.com/libp2p/js-reframe-content-routing) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Freframe-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-reframe-content-routing/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Freframe-content-routing?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Freframe-content-routing) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-reframe-content-routing/js-test-and-release.yml?branch=main&label=ci&style=flat-square)](//github.com/libp2p/js-reframe-content-routing/actions?query=branch%3Amain+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-reframe-content-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-reframe-content-routing) |
| [`@libp2p/ipni-content-routing`](//github.com/libp2p/js-ipni-content-routing) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fipni-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-ipni-content-routing/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fipni-content-routing?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fipni-content-routing) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-ipni-content-routing/js-test-and-release.yml?branch=main&label=ci&style=flat-square)](//github.com/libp2p/js-ipni-content-routing/actions?query=branch%3Amain+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-ipni-content-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-ipni-content-routing) |
| [`@libp2p/delegated-content-routing`](//github.com/libp2p/js-libp2p-delegated-content-routing) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fdelegated-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fdelegated-content-routing?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fdelegated-content-routing) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-delegated-content-routing/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing) |
| [`@libp2p/kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fkad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fkad-dht?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fkad-dht) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-kad-dht/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| **peer routing** |
| [`@libp2p/delegated-peer-routing`](//github.com/libp2p/js-libp2p-delegated-peer-routing) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fdelegated-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fdelegated-peer-routing?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fdelegated-peer-routing) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-delegated-peer-routing/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing) |
| [`@libp2p/kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fkad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fkad-dht?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fkad-dht) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-kad-dht/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) |
| **utilities** |
| [`@libp2p/crypto`](//github.com/libp2p/js-libp2p-crypto) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fcrypto.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fcrypto?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fcrypto) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-crypto/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-crypto) |
| **data types** |
| [`@libp2p/peer-id`](//github.com/libp2p/js-libp2p-peer-id) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fpeer-id.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-peer-id/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fpeer-id?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fpeer-id) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-peer-id/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-peer-id/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-peer-id/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-id) |
| [`@libp2p/record`](//github.com/libp2p/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Frecord.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-record/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Frecord?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Frecord) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-record/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-record/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-record/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-record) |
| [`@libp2p/peer-record`](//github.com/libp2p/js-libp2p-peer-record) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Fpeer-record.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-peer-record/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Fpeer-record?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Fpeer-record) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-peer-record/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-peer-record/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-peer-record/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-record) |
| **pubsub** |
| [`@ChainSafe/libp2p-gossipsub`](//github.com/ChainSafe/js-libp2p-gossipsub) | [![npm](https://img.shields.io/npm/v/%40ChainSafe%2Flibp2p-gossipsub.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/js-libp2p-gossipsub/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40ChainSafe%2Flibp2p-gossipsub?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40ChainSafe%2Flibp2p-gossipsub) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/ChainSafe/js-libp2p-gossipsub/main.yml?branch=master&label=ci&style=flat-square)](//github.com/ChainSafe/js-libp2p-gossipsub/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub) |
| [`@libp2p/floodsub`](//github.com/libp2p/js-libp2p-floodsub) | [![npm](https://img.shields.io/npm/v/%40libp2p%2Ffloodsub.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/releases) | [![Deps](https://img.shields.io/librariesio/release/npm/%40libp2p%2Ffloodsub?logo=Libraries.io&logoColor=white&style=flat-square)](//libraries.io/npm/%40libp2p%2Ffloodsub) | [![GitHub CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-floodsub/js-test-and-release.yml?branch=master&label=ci&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/actions?query=branch%3Amaster+workflow%3Aci+) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-floodsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-floodsub) |

## Used by

<div style="padding: 20px">
  <p align="middle">
    <a href="https://lodestar.chainsafe.io/"><img width="300" src="https://github.com/ChainSafe/lodestar/blob/unstable/assets/lodestar_icon_text_black_stroke.png?raw=true"></a>
    <a href="https://hoprnet.org/"><img width="150" src="https://github.com/hoprnet/hopr-assets/blob/master/v1/logo/hopr_logo_padded.png?raw=true" alt="HOPR Logo">
    <a href="https://js.ipfs.io/"><img src="https://ipfs.io/ipfs/Qme6KJdKcp85TYbLxuLV7oQzMiLremD7HMoXLZEmgo6Rnh/js-ipfs-sticker.png" alt="IPFS in JavaScript logo" width="150" /></a>
  </p>
</div>

And [many others...](https://github.com/libp2p/js-libp2p/network/dependents)

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
