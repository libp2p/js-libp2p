# libp2p-connection-manager

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![](https://coveralls.io/repos/github/libp2p/js-libp2p-connection-manager/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-connection-manager?branch=master)
[![](https://travis-ci.org/libp2p/js-libp2p-connection-manager.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-connection-manager)
[![](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

> JavaScript connection manager for libp2p

## Table of Contents

- [Install](#install)
  - [npm](#npm)
  - [Use in Node.js, a browser with browserify, webpack or any other bundler](##use-in-nodejs-or-in-the-browser-with-browserify-webpack-or-any-other-bundler)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

### npm

```bash
> npm install libp2p-connection-manager
```

### Use in Node.js or in the browser with browserify, webpack or any other bundler

```js
const ConnManager = require('libp2p-connection-manager')
```


## API

A connection manager manages the peers you're connected to. The application provides one or more limits that will trigger the disconnection of peers. These limits can be any of the following:

* number of connected peers
* maximum bandwidth (sent / received or both)
* maximum event loop delay

The connection manager will disconnect peers (starting from the less important peers) until all the measures are withing the stated limits.

A connection manager first disconnects the peers with the least value. By default all peers have the same importance (1), but the application can define otherwise. Once a peer disconnects the connection manager discards the peer importance. (If necessary, the application should redefine the peer state if the peer is again connected).


### Create a ConnectionManager

```js
const libp2p = // …
const options = {…}
const connManager = new ConnManager(libp2p, options)
```

Options is an optional object with the following key-value pairs:

* **`maxPeers`**: number identifying the maximum number of peers the current peer is willing to be connected to before is starts disconnecting. Defaults to `Infinity`
* **`maxPeersPerProtocol`**: Object with key-value pairs, where a key is the protocol tag (case-insensitive) and the value is a number, representing the maximum number of peers allowing to connect for each protocol. Defaults to `{}`.
* **`minPeers`**: number identifying the number of peers below which this node will not activate preemptive disconnections. Defaults to `0`.
* **`maxData`**: sets the maximum data — in bytes per second -  (sent and received) this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
* **`maxSentData`**: sets the maximum sent data — in bytes per second -  this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
* **`maxReceivedData`**: sets the maximum received data — in bytes per second -  this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
* **`maxEventLoopDelay`**: sets the maximum event loop delay (measured in miliseconds) this node is willing to endure before it starts disconnecting peers. Defaults to `Infinity`.
* **`pollInterval`**: sets the poll interval (in miliseconds) for assessing the current state and determining if this peer needs to force a disconnect. Defaults to `2000` (2 seconds).
* **`movingAverageInterval`**: the interval used to calculate moving averages (in miliseconds). Defaults to `60000` (1 minute).
* **`defaultPeerValue`**: number between 0 and 1. Defaults to 1.


### `connManager.start()`

Starts the connection manager.

### `connManager.stop()`

Stops the connection manager.


### `connManager.setPeerValue(peerId, value)`

Sets the peer value for a given peer id. This is used to sort peers (in reverse order of value) to determine which to disconnect from first.

Arguments:

* peerId: B58-encoded string or [`peer-id`](https://github.com/libp2p/js-peer-id) instance.
* value: a number between 0 and 1, which represents a scale of how valuable this given peer id is to the application.

### `connManager.peers()`

Returns the peers this connection manager is connected to.

Returns an array of [PeerInfo](https://github.com/libp2p/js-peer-info).

### `connManager.emit('limit:exceeded', limitName, measured)`

Emitted when a limit is exceeded. Limit names can be:

* `maxPeers`
* `minPeers`
* `maxData`
* `maxSentData`
* `maxReceivedData`
* `maxEventLoopDelay`
* a protocol tag string (lower-cased)


### `connManager.emit('disconnect:preemptive', peerId)`

Emitted when a peer is about to be preemptively disconnected.

### `connManager.emit('disconnected', peerId)`

Emitted when a peer is disconnected (preemptively or note). If this peer reconnects, you will need to reset it's value, since the connection manager does not remember it.

### `connManager.emit('connected', peerId: String)`

Emitted when a peer connects. This is a good event to set the peer value, so you can get some control over who gets banned once a maximum number of peers is reached.


## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-connection-manager/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
