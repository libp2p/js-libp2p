# @libp2p/interface-connection <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Connection interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [Connection](#connection)
- [Test suite](#test-suite)
- [API](#api)
  - [Connection](#connection-1)
    - [Creating a connection instance](#creating-a-connection-instance)
    - [Create a new stream](#create-a-new-stream)
    - [Add stream metadata](#add-stream-metadata)
    - [Remove a from the registry](#remove-a-from-the-registry)
    - [Close connection](#close-connection)
    - [Connection identifier](#connection-identifier)
    - [Connection streams registry](#connection-streams-registry)
    - [Remote peer](#remote-peer)
    - [Local peer](#local-peer)
    - [Get the connection Streams](#get-the-connection-streams)
    - [Remote address](#remote-address)
    - [Local address](#local-address)
    - [Stat](#stat)
    - [Tags](#tags)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-connection
```

## Usage

```js
import type { Connection } from '@libp2p/interface-connection'
```

This is a test suite and interface you can use to implement a connection. The connection interface contains all the metadata associated with it, as well as an array of the streams opened through this connection. In the same way as the connection, a stream contains properties with its metadata, plus an iterable duplex object that offers a mechanism for writing and reading data, with back pressure. This module and test suite were heavily inspired by abstract-blob-store and interface-stream-muxer.

The primary goal of this module is to enable developers to pick, swap or upgrade their connection without losing the same API expectations and mechanisms such as back pressure and the ability to half close a connection.

Publishing a test suite as a module lets multiple modules ensure compatibility since they use the same test suite.

## Connection

Before creating a connection from a transport compatible with `libp2p` it is important to understand some concepts:

- **socket**: the underlying raw duplex connection between two nodes. It is created by the transports during a dial/listen.
- **[multiaddr connection](https://github.com/libp2p/interface-transport#multiaddrconnection)**: an abstraction over the socket to allow it to work with multiaddr addresses. It is a duplex connection that transports create to wrap the socket before passing to an upgrader that turns it into a standard connection (see below).
- **connection**: a connection between two *peers* that has built in multiplexing and info about the connected peer. It is created from a [multiaddr connection](https://github.com/libp2p/interface-transport#multiaddrconnection) by an upgrader. The upgrader uses multistream-select to add secio and multiplexing and returns this object.
- **stream**: a muxed duplex channel of the `connection`. Each connection may have many streams.

A connection stands for the libp2p communication duplex layer between two nodes. It is **not** the underlying raw transport duplex layer (socket), such as a TCP socket, but an abstracted layer that sits on top of the raw socket.

This helps ensuring that the transport is responsible for socket management, while also allowing the application layer to handle the connection management.

## Test suite

```js
const tests = require('@libp2p/interface-connection-compliance-tests')
describe('your connection', () => {
  tests({
    // Options should be passed to your connection
    async setup (options) {
      return YourConnection
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})
```

## API

### Connection

A valid connection (one that follows this abstraction), must implement the following API:

- type: `Connection`

```js
new Connection({
  localAddr,
  remoteAddr,
  localPeer,
  remotePeer,
  newStream,
  close,
  getStreams,
  stat: {
    direction,
    timeline: {
      open,
      upgraded
    },
    multiplexer,
    encryption
  }
})
```

- `<Multiaddr> conn.localAddr`
- `<Multiaddr> conn.remoteAddr`
- `<PeerId> conn.localPeer`
- `<PeerId> conn.remotePeer`
- `<Object> conn.stat`
- `<Map> conn.registry`
- `Array<Stream> conn.streams`
- `Promise<object> conn.newStream(Array<protocols>)`
- `<void> conn.removeStream(id)`
- `<Stream> conn.addStream(stream, protocol, metadata)`
- `Promise<> conn.close()`

It can be obtained as follows:

```js
const { Connection } = require('interface-connection')

const conn = new Connection({
  localAddr: maConn.localAddr,
  remoteAddr: maConn.remoteAddr,
  localPeer: this._peerId,
  remotePeer,
  newStream,
  close: err => maConn.close(err),
  getStreams,
  stats: {
    direction: 'outbound',
    timeline: {
      open: maConn.timeline.open,
      upgraded: Date.now()
    },
    multiplexer,
    encryption
  }
})
```

#### Creating a connection instance

- `JavaScript` - `const conn = new Connection({localAddr, remoteAddr, localPeer, remotePeer, newStream, close, getStreams, direction, multiplexer, encryption})`

Creates a new Connection instance.

`localAddr` is the optional [multiaddr](https://github.com/multiformats/multiaddr) address used by the local peer to reach the remote.
`remoteAddr` is the optional [multiaddr](https://github.com/multiformats/multiaddr) address used to communicate with the remote peer.
`localPeer` is the [PeerId](https://github.com/libp2p/js-peer-id) of the local peer.
`remotePeer` is the [PeerId](https://github.com/libp2p/js-peer-id) of the remote peer.
`newStream` is the `function` responsible for getting a new muxed+multistream-selected stream.
`close` is the `function` responsible for closing the raw connection.
`getStreams` is the `function` responsible for getting the streams muxed within the connection.
`stats` is an `object` with the metadata of the connection. It contains:

- `direction` is a `string` indicating whether the connection is `inbound` or `outbound`.
- `timeline` is an `object` with the relevant events timestamps of the connection (`open`, `upgraded` and `closed`; the `closed` will be added when the connection is closed).
- `multiplexer` is a `string` with the connection multiplexing codec (optional).
- `encryption` is a `string` with the connection encryption method identifier (optional).
- `status` is a `string` indicating the overall status of the connection. It is one of \[`'open'`, `'closing'`, `'closed'`]

#### Create a new stream

- `JavaScript` - `conn.newStream(protocols)`

Create a new stream within the connection.

`protocols` is an array of the intended protocol to use (by order of preference). Example: `[/echo/1.0.0]`

It returns a `Promise` with an object with the following properties:

```js
{
  stream,
  protocol
}
```

The stream property contains the muxed stream, while the protocol contains the protocol codec used by the stream.

#### Add stream metadata

- `JavaScript` - `conn.addStream(stream, { protocol, ...metadata })`

Add a new stream to the connection registry.

`stream` is a muxed stream.
`protocol` is the string codec for the protocol used by the stream. Example: `/echo/1.0.0`
`metadata` is an object containing any additional, optional, stream metadata that you wish to track (such as its `tags`).

#### Remove a from the registry

- `JavaScript` - `conn.removeStream(id)`

Removes the stream with the given id from the connection registry.

`id` is the unique id of the stream for this connection.

#### Close connection

- `JavaScript` - `conn.close()`

This method closes the connection to the remote peer, as well as all the streams muxed within the connection.

It returns a `Promise`.

#### Connection identifier

- `JavaScript` - `conn.id`

This property contains the identifier of the connection.

#### Connection streams registry

- `JavaScript` - `conn.registry`

This property contains a map with the muxed streams indexed by their id. This registry contains the protocol used by the stream, as well as its metadata.

#### Remote peer

- `JavaScript` - `conn.remotePeer`

This property contains the remote `peer-id` of this connection.

#### Local peer

- `JavaScript` - `conn.localPeer`

This property contains the local `peer-id` of this connection.

#### Get the connection Streams

- `JavaScript` - `conn.streams`

This getter returns all the muxed streams within the connection.

It returns an `Array`.

#### Remote address

- `JavaScript` - `conn.remoteAddr`

This getter returns the `remote` [multiaddr](https://github.com/multiformats/multiaddr) address.

#### Local address

- `JavaScript` - `conn.localAddr`

This getter returns the `local` [multiaddr](https://github.com/multiformats/multiaddr) address.

#### Stat

- `JavaScript` - `conn.stat`

This getter returns an `Object` with the metadata of the connection, as follows:

- `status`:

This property contains the status of the connection. It can be either `open`, `closing` or `closed`. Once the connection is created it is in an `open` status. When a `conn.close()` happens, the status will change to `closing` and finally, after all the connection streams are properly closed, the status will be `closed`. These values can also be directly referenced by importing the `status` file:

```js
const {
  OPEN, CLOSING, CLOSED
} = require('libp2p-interfaces/src/connection/status')

if (connection.stat.status === OPEN) {
  // ...
}
```

- `timeline`:

This property contains an object with the `open`, `upgraded` and `close` timestamps of the connection. Note that, the `close` timestamp is `undefined` until the connection is closed.

- `direction`:

This property contains the direction of the peer in the connection. It can be `inbound` or `outbound`.

- `multiplexer`:

This property contains the `multiplexing` codec being used in the connection.

- `encryption`:

This property contains the encryption method being used in the connection. It is `undefined` if the connection is not encrypted.

#### Tags

- `JavaScript` - `conn.tags`

This property contains an array of tags associated with the connection. New tags can be pushed to this array during the connection's lifetime.

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_connection.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
