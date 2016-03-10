libp2p-swarm JavaScript implementation
======================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) [![Build Status](https://img.shields.io/travis/diasdavid/js-ipfs-swarm/master.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-ipfs-swarm)

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

### `swarm.handle(protocol, handler)`

handle a new protocol.

- `protocol`
- `handler` - function called when we receive a dial on `protocol. Signature must be `function (conn) {}`

### `swarm.close(callback)`

close all the listeners and muxers.

- `callback`

