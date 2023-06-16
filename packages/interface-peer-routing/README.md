# @libp2p/interface-peer-routing <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Peer Routing interface for libp2p

## Table of contents <!-- omit in toc -->

- - [Install](#install)
- [Modules that implement the interface](#modules-that-implement-the-interface)
- [Badge](#badge)
- [How to use the battery of tests](#how-to-use-the-battery-of-tests)
  - [Node.js](#nodejs)
- [API](#api)
  - - [findPeer](#findpeer)
  - [API Docs](#api-docs)
  - [License](#license)
  - [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-peer-routing
```

The primary goal of this module is to enable developers to pick and swap their Peer Routing module as they see fit for their libp2p installation, without having to go through shims or compatibility issues. This module and test suite were heavily inspired by abstract-blob-store and interface-stream-muxer.

Publishing a test suite as a module lets multiple modules all ensure compatibility since they use the same test suite.

# Modules that implement the interface

- [JavaScript libp2p-kad-dht](https://github.com/libp2p/js-libp2p-kad-dht)
- [JavaScript libp2p-delegated-peer-routing](https://github.com/libp2p/js-libp2p-delegated-peer-routing)

# Badge

Include this badge in your readme if you make a module that is compatible with the interface-record-store API. You can validate this by running the tests.

![](img/badge.png)

# How to use the battery of tests

## Node.js

TBD

# API

A valid (read: that follows this abstraction) Peer Routing module must implement the following API.

### findPeer

- `findPeer(peerId)`

Query the network for all multiaddresses associated with a `PeerId`.

**Parameters**

- [peerId](https://github.com/libp2p/js-peer-id).

**Returns**

It returns the [peerId](https://github.com/libp2p/js-peer-id) together with the known peers [multiaddrs](https://github.com/multiformats/js-multiaddr), as follows:

`Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>`

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_peer_routing.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
