libp2p-switch JavaScript implementation
======================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://img.shields.io/travis/libp2p/js-libp2p-switch/master.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-switch)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-switch.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-switch)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-switch/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-switch?branch=master)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-switch.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-switch)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> libp2p-switch is a dialar machine, it leverages the multiple libp2p transports, stream muxers, crypto channels and other connection upgrades to dial to peers in the libp2p network. It also supports Protocol Multiplexing through a multicodec and multistream-select handshake.

libp2p-switch is used by [libp2p](https://github.com/libp2p/js-libp2p) but it can be also used as a standalone module.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Create a libp2p switch](#create-a-libp2p-switch)
- [API](#api)
  - [`switch.dial(peer, protocol, callback)`](#swarmdialpi-protocol-callback)
  - [`switch.hangUp(peer, callback)`](#swarmhanguppi-callback)
  - [`switch.handle(protocol, handler)`](#swarmhandleprotocol-handler)
  - [`switch.unhandle(protocol)`](#swarmunhandleprotocol)
  - [`switch.start(callback)`](#swarmlistencallback)
  - [`switch.stop(callback)`](#swarmclosecallback)
  - [`switch.connection`](#connection)
  - [Internal Transports API](#transports)
- [Design Notes](#designnotes)
  - [Multitransport](#multitransport)
  - [Connection upgrades](#connection-upgrades)
  - [Identify](#identify)
  - [Notes](#notes)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
> npm install libp2p-switch --save
```

## Usage

### Create a libp2p Switch

```JavaScript
const switch = require('libp2p-switch')

const sw = new switch(peerInfo [, peerBook])
```

## API

- peerInfo is a [PeerInfo](https://github.com/libp2p/js-peer-info) object that has the peer information.
- peerBook is a [PeerBook](https://github.com/libp2p/js-peer-book) object that stores all the known peers.

### `switch.dial(peer, protocol, callback)`

dial uses the best transport (whatever works first, in the future we can have some criteria), and jump starts the connection until the point where we have to negotiate the protocol. If a muxer is available, then drop the muxer onto that connection. Good to warm up connections or to check for connectivity. If we have already a muxer for that peerInfo, then do nothing.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `protocol`
- `callback`

### `switch.hangUp(peer, callback)`

Hang up the muxed connection we have with the peer.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `callback`


### `switch.handle(protocol, handlerFunc, matchFunc)`

Handle a new protocol.

- `protocol`
- `handlerFunc` - function called when we receive a dial on `protocol. Signature must be `function (protocol, conn) {}`
- `matchFunc` - matchFunc for multistream-select

### `switch.unhandle(protocol)`

Unhandle a protocol.

- `protocol`

### `switch.on('peer-mux-established', (peer) => {})`

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just established a muxed connection with.

### `switch.on('peer-mux-closed', (peer) => {})`

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just closed a muxed connection.

### `switch.start(callback)`

Start listening on all added transports that are available on the current `peerInfo`.

### `switch.stop(callback)`

Close all the listeners and muxers.

- `callback`

### `switch.connection`

##### `switch.connection.addUpgrade()`

A connection upgrade must be able to receive and return something that implements the [interface-connection](https://github.com/libp2p/interface-connection) specification.

> **WIP**

##### `switch.connection.addStreamMuxer(muxer)`

Upgrading a connection to use a stream muxer is still considered an upgrade, but a special case since once this connection is applied, the returned obj will implement the [interface-stream-muxer](https://github.com/libp2p/interface-stream-muxer) spec.

- `muxer`

##### `switch.connection.reuse()`

Enable the identify protocol.

##### `switch.connection.crypto([tag, encrypt])`

Enable a specified crypto protocol. By default no encryption is used, aka `plaintext`. If called with no arguments it resets to use `plaintext`.

You can use for example [libp2p-secio](https://github.com/libp2p/js-libp2p-secio) like this

```js
const secio = require('libp2p-secio')
switch.connection.crypto(secio.tag, secio.encrypt)
```

##### `switch.connection.enableCircuitRelay(options, callback)`

Enable circuit relaying.

- `options`
    - enabled - activates relay dialing and listening functionality
    - hop - an object with two properties
        - enabled - enables circuit relaying
        - active - is it an active or passive relay (default false)
- `callback`

### Internal Transports API

##### `switch.transport.add(key, transport, options)`

libp2p-switch expects transports that implement [interface-transport](https://github.com/libp2p/interface-transport). For example [libp2p-tcp](https://github.com/libp2p/js-libp2p-tcp).

- `key` - the transport identifier.
- `transport` -
- `options` -

##### `switch.transport.dial(key, multiaddrs, callback)`

Dial to a peer on a specific transport.

- `key`
- `multiaddrs`
- `callback`

##### `switch.transport.listen(key, options, handler, callback)`

Set a transport to start listening mode.

- `key`
- `options`
- `handler`
- `callback`

##### `switch.transport.close(key, callback)`

Close the listeners of a given transport.

- `key`
- `callback`

## Design Notes

### Multitransport

libp2p is designed to support multiple transports at the same time. While peers are identified by their ID (which are generated from their public keys), the addresses of each pair may vary, depending the device where they are being run or the network in which they are accessible through.

In order for a transport to be supported, it has to follow the [interface-transport](https://github.com/libp2p/interface-transport) spec.

### Connection upgrades

Each connection in libp2p follows the [interface-connection](https://github.com/libp2p/interface-connection) spec. This design decision enables libp2p to have upgradable transports.

We think of `upgrade` as a very important notion when we are talking about connections, we can see mechanisms like: stream multiplexing, congestion control, encrypted channels, multipath, simulcast, etc, as `upgrades` to a connection. A connection can be a simple and with no guarantees, drop a packet on the network with a destination thing, a transport in the other hand can be a connection and or a set of different upgrades that are mounted on top of each other, giving extra functionality to that connection and therefore `upgrading` it.

Types of upgrades to a connection:

- encrypted channel (with TLS for e.g)
- congestion flow (some transports don't have it by default)
- multipath (open several connections and abstract it as a single connection)
- simulcast (still really thinking this one through, it might be interesting to send a packet through different connections under some hard network circumstances)
- stream-muxer - this a special case, because once we upgrade a connection to a stream-muxer, we can open more streams (multiplex them) on a single stream, also enabling us to reuse the underlying dialed transport

We also want to enable flexibility when it comes to upgrading a connection, for example, we might that all dialed transports pass through the encrypted channel upgrade, but not the congestion flow, specially when a transport might have already some underlying properties (UDP vs TCP vs WebRTC vs every other transport protocol)

### Identify

Identify is a protocol that switchs mounts on top of itself, to identify the connections between any two peers. E.g:

- a) peer A dials a conn to peer B
- b) that conn gets upgraded to a stream multiplexer that both peers agree
- c) peer B executes de identify protocol
- d) peer B now can open streams to peer A, knowing which is the identity of peer A

In addition to this, we also share the 'observed addresses' by the other peer, which is extremely useful information for different kinds of network topologies.

### Notes

To avoid the confusion between connection, stream, transport, and other names that represent an abstraction of data flow between two points, we use terms as:

- connection - something that implements the transversal expectations of a stream between two peers, including the benefits of using a stream plus having a way to do half duplex, full duplex
- transport - something that as a dial/listen interface and return objs that implement a connection interface

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/pull-stream/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.


## Contribute

This module is actively under development. Please check out the issues and submit PRs!

## License

MIT © Protocol Labs
