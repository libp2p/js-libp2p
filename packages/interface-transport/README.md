# @libp2p/interface-transport <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Transport interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Modules that implement the interface](#modules-that-implement-the-interface)
- [Badge](#badge)
- [How to use the battery of tests](#how-to-use-the-battery-of-tests)
- [Node.js](#nodejs)
- [API](#api)
  - [Types](#types)
    - [Upgrader](#upgrader)
    - [MultiaddrConnection](#multiaddrconnection)
  - [Creating a transport instance](#creating-a-transport-instance)
  - [Dial to another peer](#dial-to-another-peer)
  - [Canceling a dial](#canceling-a-dial)
  - [Filtering Addresses](#filtering-addresses)
  - [Create a listener](#create-a-listener)
  - [Start a listener](#start-a-listener)
  - [Get listener addrs](#get-listener-addrs)
  - [Stop a listener](#stop-a-listener)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-transport
```

The primary goal of this module is to enable developers to pick and swap their transport module as they see fit for their libp2p installation, without having to go through shims or compatibility issues. This module and test suite were heavily inspired by abstract-blob-store, interface-stream-muxer and others.

Publishing a test suite as a module lets multiple modules all ensure compatibility since they use the same test suite.

The purpose of this interface is not to reinvent any wheels when it comes to dialing and listening to transports. Instead, it tries to provide a uniform API for several transports through a shimmed interface.

## Modules that implement the interface

- [js-libp2p-tcp](https://github.com/libp2p/js-libp2p-tcp)
- [js-libp2p-webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star)
- [js-libp2p-webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct)
- [js-libp2p-websocket-star](https://github.com/libp2p/js-libp2p-websocket-star)
- [js-libp2p-websockets](https://github.com/libp2p/js-libp2p-websockets)
- [js-libp2p-utp](https://github.com/libp2p/js-libp2p-utp)
- [webrtc-explorer](https://github.com/diasdavid/webrtc-explorer)

## Badge

Include this badge in your readme if you make a module that is compatible with the interface-transport API. You can validate this by running the tests.

![](img/badge.png)

## How to use the battery of tests

## Node.js

```js
/* eslint-env mocha */
'use strict'

const tests = require('libp2p-interfaces-compliance-tests/transport')
const multiaddr = require('@multiformats/multiaddr')
const YourTransport = require('../src')

describe('compliance', () => {
  tests({
    setup (init) {
      let transport = new YourTransport(init)

      const addrs = [
        multiaddr('valid-multiaddr-for-your-transport'),
        multiaddr('valid-multiaddr2-for-your-transport')
      ]

      const network = require('my-network-lib')
      const connect = network.connect
      const connector = {
        delay (delayMs) {
          // Add a delay in the connection mechanism for the transport
          // (this is used by the dial tests)
          network.connect = (...args) => setTimeout(() => connect(...args), delayMs)
        },
        restore () {
          // Restore the connection mechanism to normal
          network.connect = connect
        }
      }

      return { transport, addrs, connector }
    },
    teardown () {
      // Clean up any resources created by setup()
    }
  })
})
```

## API

A valid transport (one that follows the interface defined) must implement the following API:

**Table of contents:**

- type: `Transport`
  - `new Transport({ upgrader, ...[options] })`
  - `<Promise> transport.dial(multiaddr, [options])`
  - `<Multiaddr[]> transport.filter(multiaddrs)`
  - `transport.createListener([options], handlerFunction)`
  - type: `transport.Listener`
    - event: 'listening'
    - event: 'close'
    - event: 'connection'
    - event: 'error'
    - `<Promise> listener.listen(multiaddr)`
    - `listener.getAddrs()`
    - `<Promise> listener.close([options])`

### Types

#### Upgrader

Upgraders have 2 methods: `upgradeOutbound` and `upgradeInbound`.

- `upgradeOutbound` must be called and returned by `transport.dial`.
- `upgradeInbound` must be called and the results must be passed to the `createListener` `handlerFunction` and the `connection` event handler, any time a new connection is created.

```js
const connection = await upgrader.upgradeOutbound(multiaddrConnection)
const connection = await upgrader.upgradeInbound(multiaddrConnection)
```

The `Upgrader` methods take a [MultiaddrConnection](#multiaddrconnection) and will return an `interface-connection` instance.

#### MultiaddrConnection

- `MultiaddrConnection`
  - `sink<function(source)>`: A [streaming iterable sink](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#sink-it)
  - `source<AsyncIterator>`: A [streaming iterable source](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#source-it)
  - `close<function(Error)>`: A method for closing the connection
  - `conn`: The raw connection of the transport, such as a TCP socket.
  - `remoteAddr<Multiaddr>`: The remote `Multiaddr` of the connection.
  - `[localAddr<Multiaddr>]`: An optional local `Multiaddr` of the connection.
  - `timeline<object>`: A hash map of connection time events
    - `open<number>`: The time in ticks the connection was opened
    - `close<number>`: The time in ticks the connection was closed

### Creating a transport instance

- `const transport = new Transport({ upgrader, ...[options] })`

Creates a new Transport instance. `options` is an JavaScript object that should include the necessary parameters for the transport instance. Options **MUST** include an `Upgrader` instance, as Transports will use this to return `interface-connection` instances from `transport.dial` and the listener `handlerFunction`.

**Note: Why is it important to instantiate a transport -** Some transports have state that can be shared between the dialing and listening parts. For example with libp2p-webrtc-star, in order to dial a peer, the peer must be part of some signaling network that is shared with the listener.

### Dial to another peer

- `const connection = await transport.dial(multiaddr, [options])`

This method uses a transport to dial a Peer listening on `multiaddr`.

`multiaddr` must be of the type [`multiaddr`](https://www.npmjs.com/multiaddr).

`[options]` the options that may be passed to the dial. Must support the `signal` option (see below)

Dial **MUST** call and return `upgrader.upgradeOutbound(multiaddrConnection)`. The upgrader will return an [interface-connection](../connection) instance.

The dial may throw an `Error` instance if there was a problem connecting to the `multiaddr`.

### Canceling a dial

Dials may be cancelled using an `AbortController`:

```Javascript
const { AbortError } = require('libp2p-interfaces/src/transport/errors')
const controller = new AbortController()
try {
  const conn = await mytransport.dial(ma, { signal: controller.signal })
  // Do stuff with conn here ...
} catch (err: any) {
  if(err.code === AbortError.code) {
    // Dial was aborted, just bail out
    return
  }
  throw err
}

// ----
// In some other part of the code:
  controller.abort()
// ----
```

### Filtering Addresses

- `const supportedAddrs = await transport.filter(multiaddrs)`

When using a transport its important to be able to filter out `multiaddr`s that the transport doesn't support. A transport instance provides a filter method to return only the valid addresses it supports.

`multiaddrs` must be an array of type [`multiaddr`](https://www.npmjs.com/multiaddr).
Filter returns an array of `multiaddr`.

### Create a listener

- `const listener = transport.createListener([options], handlerFunction)`

This method creates a listener on the transport. Implementations **MUST** call `upgrader.upgradeInbound(multiaddrConnection)` and pass its results to the `handlerFunction` and any emitted `connection` events.

`options` is an optional object that contains the properties the listener must have, in order to properly listen on a given transport/socket.

`handlerFunction` is a function called each time a new connection is received. It must follow the following signature: `function (conn) {}`, where `conn` is a connection that follows the [`interface-connection`](../connection).

The listener object created may emit the following events:

- `listening` - when the listener is ready for incoming connections
- `close` - when the listener is closed
- `connection` - (`conn`) each time an incoming connection is received
- `error` - (`err`) each time there is an error on the connection

### Start a listener

- `await listener.listen(multiaddr)`

This method puts the listener in `listening` mode, waiting for incoming connections.

`multiaddr` is the address that the listener should bind to.

### Get listener addrs

- `listener.getAddrs()`

This method returns the addresses on which this listener is listening. Useful when listening on port 0 or any interface (0.0.0.0).

### Stop a listener

- `await listener.close([options])`

This method closes the listener so that no more connections can be opened on this transport instance.

`options` is an optional object that may contain the following properties:

- `timeout` - A timeout value (in ms) after which all connections on this transport will be destroyed if the transport is not able to close gracefully. (e.g `{ timeout: 1000 }`)

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_transport.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
