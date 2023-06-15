# @libp2p/interface-peer-discovery <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Peer Discovery interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Modules that implement the interface](#modules-that-implement-the-interface)
- [Badge](#badge)
- [Usage](#usage)
  - [Node.js](#nodejs)
- [API](#api)
  - [`start` the service](#start-the-service)
  - [`stop` the service](#stop-the-service)
  - [discovering peers](#discovering-peers)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-peer-discovery
```

The primary goal of this module is to enable developers to pick and/or swap their Peer Discovery modules as they see fit for their application, without having to go through shims or compatibility issues. This module and test suite was heavily inspired by [abstract-blob-store](https://github.com/maxogden/abstract-blob-store).

Publishing a test suite as a module lets multiple modules all ensure compatibility since they use the same test suite.

The API is presented with both Node.js and Go primitives, however, there is not actual limitations for it to be extended for any other language, pushing forward the cross compatibility and interop through different stacks.

## Modules that implement the interface

- [JavaScript libp2p-mdns](https://github.com/libp2p/js-libp2p-mdns)
- [JavaScript libp2p-bootstrap](https://github.com/libp2p/js-libp2p-bootstrap)
- [JavaScript libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [JavaScript libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [JavaScript libp2p-websocket-star](https://github.com/libp2p/js-libp2p-websocket-star)
- [TypeScript discv5](https://github.com/chainsafe/discv5)

Send a PR to add a new one if you happen to find or write one.

## Badge

Include this badge in your readme if you make a new module that uses interface-peer-discovery API.

![](img/badge.png)

## Usage

### Node.js

Install `interface-discovery` as one of the dependencies of your project and as a test file. Then, using `mocha` (for JavaScript) or a test runner with compatible API, do:

```js
const tests = require('libp2p-interfaces-compliance-tests/peer-discovery')

describe('your discovery', () => {
  // use all of the test suits
  tests({
    setup () {
      return YourDiscovery
    },
    teardown () {
      // Clean up any resources created by setup()
    }
  })
})
```

## API

A valid (read: that follows this abstraction) Peer Discovery module must implement the following API:

### `start` the service

- `await discovery.start()`

Start the discovery service.

It returns a `Promise`

### `stop` the service

- `await discovery.stop()`

Stop the discovery service.

It returns a `Promise`

### discovering peers

- `discovery.on('peer', (peerData) => {})`

Every time a peer is discovered by a discovery service, it emits a `peer` event with the discovered peer's information, which must contain the following properties:

- `<`[`PeerId`](https://github.com/libp2p/js-peer-id)`>` `peerData.id`
- `<Array<`[`Multiaddr`](https://github.com/multiformats/js-multiaddr)`>>` `peerData.multiaddrs`

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_peer_discovery.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
