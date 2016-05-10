libp2p-swarm JavaScript implementation
======================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://img.shields.io/travis/diasdavid/js-libp2p-swarm/master.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-libp2p-swarm)
[![Coverage Status](https://coveralls.io/repos/github/diasdavid/js-libp2p-swarm/badge.svg?branch=master)](https://coveralls.io/github/diasdavid/js-libp2p-swarm?branch=master)
[![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-swarm.svg?style=flat-square)](https://david-dm.org/ipfs/js-libp2p-swarm)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> libp2p swarm implementation in JavaScript

# Description

libp2p-swarm is a connection abstraction that is able to leverage several transports and connection upgrades, such as congestion control, channel encryption, multiplexing several streams in one connection, and more. It does this by bringing protocol multiplexing to the application level (instead of the traditional Port level) using multicodec and multistream.

libp2p-swarm is used by libp2p but it can be also used as a standalone module.

# Usage

## Install

libp2p-swarm is available on npm and so, like any other npm module, just:

```bash
> npm install libp2p-swarm --save
```

## API

#### Create a libp2p Swarm

And use it in your Node.js code as:

```JavaScript
const Swarm = require('libp2p-swarm')

const sw = new Swarm(peerInfo)
```

peerInfo is a [PeerInfo](https://github.com/diasdavid/js-peer-info) object that represents the peer creating this swarm instance.

### Transports

##### `swarm.transport.add(key, transport, options, callback)`

libp2p-swarm expects transports that implement [interface-transport](https://github.com/diasdavid/abstract-transport). For example [libp2p-tcp](https://github.com/diasdavid/js-libp2p-tcp).

- `key` - the transport identifier
- `transport` -
- `options`
- `callback`

##### `swarm.transport.dial(key, multiaddrs, callback)`

Dial to a peer on a specific transport.

- `key`
- `multiaddrs`
- `callback`

##### `swarm.transport.listen(key, options, handler, callback)`

Set a transport to start listening mode.

- `key`
- `options`
- `handler`
- `callback`

##### `swarm.transport.close(key, callback)`

Close the listeners of a given transport.

- `key`
- `callback`

### Connection

##### `swarm.connection.addUpgrade()`

A connection upgrade must be able to receive and return something that implements the [interface-connection](https://github.com/diasdavid/interface-connection) specification.

> **WIP**

##### `swarm.connection.addStreamMuxer(muxer)`

Upgrading a connection to use a stream muxer is still considered an upgrade, but a special case since once this connection is applied, the returned obj will implement the [interface-stream-muxer](https://github.com/diasdavid/interface-stream-muxer) spec.

- `muxer`

##### `swarm.connection.reuse()`

Enable the identify protocol

### `swarm.dial(pi, protocol, callback)`

dial uses the best transport (whatever works first, in the future we can have some criteria), and jump starts the connection until the point we have to negotiate the protocol. If a muxer is available, then drop the muxer onto that connection. Good to warm up connections or to check for connectivity. If we have already a muxer for that peerInfo, than do nothing.

- `pi` - peer info project
- `protocol`
- `callback`

### `swarm.listen(callback)`

Start listening on all added transports that are available on the current `peerInfo`.

### `swarm.handle(protocol, handler)`

handle a new protocol.

- `protocol`
- `handler` - function called when we receive a dial on `protocol. Signature must be `function (conn) {}`

### `swarm.unhandle(protocol)`

unhandle a protocol.

- `protocol`

### `swarm.close(callback)`

close all the listeners and muxers.

- `callback`

# Design

## Multitransport

libp2p is designed to support multiple transports at the same time. While peers are identified by their ID (which are generated from their public keys), the addresses of each pair may vary, depending the device where they are being run or the network in which they are accessible through.

In order for a transport to be supported, it has to follow the [interface-transport](https://github.com/diasdavid/interface-transport) spec.

## Connection upgrades

Each connection in libp2p follows the [interface-connection](https://github.com/diasdavid/interface-connection) spec. This design decision enables libp2p to have upgradable transports.

We think of `upgrade` as a very important notion when we are talking about connections, we can see mechanisms like: stream multiplexing, congestion control, encrypted channels, multipath, simulcast, etc, as `upgrades` to a connection. A connection can be a simple and with no guarantees, drop a packet on the network with a destination thing, a transport in the other hand can be a connection and or a set of different upgrades that are mounted on top of each other, giving extra functionality to that connection and therefore `upgrading` it.

Types of upgrades to a connection:

- encrypted channel (with TLS for e.g)
- congestion flow (some transports don't have it by default)
- multipath (open several connections and abstract it as a single connection)
- simulcast (still really thinking this one through, it might be interesting to send a packet through different connections under some hard network circumstances)
- stream-muxer - this a special case, because once we upgrade a connection to a stream-muxer, we can open more streams (multiplex them) on a single stream, also enabling us to reuse the underlying dialed transport

We also want to enable flexibility when it comes to upgrading a connection, for example, we might that all dialed transports pass through the encrypted channel upgrade, but not the congestion flow, specially when a transport might have already some underlying properties (UDP vs TCP vs WebRTC vs every other transport protocol)

## Identify

Identify is a protocol that Swarms mounts on top of itself, to identify the connections between any two peers. E.g:

- a) peer A dials a conn to peer B
- b) that conn gets upgraded to a stream multiplexer that both peers agree
- c) peer B executes de identify protocol
- d) peer B now can open streams to peer A, knowing which is the identity of peer A

In addition to this, we also share the 'observed addresses' by the other peer, which is extremely useful information for different kinds of network topologies.

## Notes

To avoid the confusion between connection, stream, transport, and other names that represent an abstraction of data flow between two points, we use terms as:

- connection - something that implements the transversal expectations of a stream between two peers, including the benefits of using a stream plus having a way to do half duplex, full duplex
- transport - something that as a dial/listen interface and return objs that implement a connection interface
