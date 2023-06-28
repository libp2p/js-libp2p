# @libp2p/daemon-client <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> libp2p-daemon client implementation

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Specs](#specs)
- [Usage](#usage)
  - [Run a daemon process](#run-a-daemon-process)
  - [Interact with the daemon process using the client](#interact-with-the-daemon-process-using-the-client)
- [API](#api)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/daemon-client
```

## Specs

The specs for the daemon are currently housed in the go implementation. You can read them at [libp2p/go-libp2p-daemon](https://github.com/libp2p/go-libp2p-daemon/blob/master/specs/README.md)

## Usage

### Run a daemon process

There are currently two implementations of the `libp2p-daemon`:

- [js-libp2p-daemon](https://github.com/libp2p/js-libp2p-daemon)
- [go-libp2p-daemon](https://github.com/libp2p/go-libp2p-daemon)

### Interact with the daemon process using the client

```js
import { createClient } from '@libp2p/daemon-client'
import { multiaddr } from '@multiformats/multiaddr'

const serverAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
const client = createClient(serverAddr)

// interact with the daemon
let identify
try {
  identify = await client.identify()
} catch (err) {
  // ...
}

// close the socket
await client.close()
```

## API

- [Getting started](API.md#getting-started)
- [`close`](API.md#close)
- [`connect`](API.md#connect)
- [`identify`](API.md#identify)
- [`listPeers`](API.md#listPeers)
- [`openStream`](API.md#openStream)
- [`registerStream`](API.md#registerStream)
- [`dht.put`](API.md#dht.put)
- [`dht.get`](API.md#dht.get)
- [`dht.findPeer`](API.md#dht.findPeer)
- [`dht.provide`](API.md#dht.provide)
- [`dht.findProviders`](API.md#dht.findProviders)
- [`dht.getClosestPeers`](API.md#dht.getClosestPeers)
- [`dht.getPublicKey`](API.md#dht.getPublicKey)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
