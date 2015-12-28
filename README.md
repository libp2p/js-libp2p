libp2p-swarm JavaScript implementation
======================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) [![Build Status](https://img.shields.io/travis/diasdavid/js-ipfs-swarm/master.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-ipfs-swarm)

> libp2p swarm implementation in JavaScript

# Description

libp2p-swarm is a connection abstraction that is able to leverage several transports and connection upgrades, such as congestion control, channel encryption, multiplexing several streams in one connection, and more. It does this by bringing protocol multiplexing to the application level (instead of the traditional Port level) using multicodec and multistream.

libp2p-swarm is used by libp2p but it can be also used as a standalone module.

# Usage

### Install and create a Swarm

libp2p-swarm is available on npm and so, like any other npm module, just:

```bash
$ npm install libp2p-swarm --save
```

And use it in your Node.js code as:

```JavaScript
var Swarm = require('libp2p-swarm')

var sw = new Swarm(peerInfoSelf)
```

peerInfoSelf is a [PeerInfo](https://github.com/diasdavid/js-peer-info) object that represents the peer creating this swarm instance.

### Support a transport

libp2p-swarm expects transports that implement [abstract-transport](https://github.com/diasdavid/abstract-transport). For example [libp2p-tcp](https://github.com/diasdavid/js-libp2p-tcp), a simple shim on top of the `net` module to make it work with swarm expectations.

```JavaScript
sw.addTransport(transport, [options, dialOptions, listenOptions])
```

### Add a connection upgrade

A connection upgrade must be able to receive and return something that implements the [abstract-connection](https://github.com/diasdavid/abstract-connection) interface.

```JavaScript
sw.addUpgrade(connUpgrade, [options])
```

Upgrading a connection to use a stream muxer is still considered an upgrade, but a special case since once this connection is applied, the returned obj will implement the [abstract-stream-muxer](https://github.com/diasdavid/abstract-stream-muxer) interface.

```JavaScript
sw.addStreamMuxer(streamMuxer, [options])
```

### Dial to another peer

```JavaScript
sw.dial(PeerInfo, options, protocol, callback)
sw.dial(PeerInfo, options, callback)
```

dial uses the best transport (whatever works first, in the future we can have some criteria), and jump starts the connection until the point we have to negotiate the protocol. If a muxer is available, then drop the muxer onto that connection. Good to warm up connections or to check for connectivity. If we have already a muxer for that peerInfo, than do nothing.

### Accept requests on a specific protocol

```JavaScript
sw.handleProtocol(protocol, handlerFunction)
```

### Cleaning up before exiting

Each time you add a transport or dial you create connections. Be sure to close
them up before exiting. To do so you can:

Close a transport listener:

```js
sw.closeListener(transportName, callback)
sw.closeAllListeners(callback)
```

Close all open connections

```js
sw.closeConns(callback)
```

Close everything!

```js
sw.close(callback)
```
