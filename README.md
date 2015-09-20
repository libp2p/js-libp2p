node-libp2p
===========

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) ![Build Status](https://travis-ci.org/diasdavid/node-libp2p.svg?style=flat-square)](https://travis-ci.org/diasdavid/node-libp2p) ![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square) [![Dependency Status](https://david-dm.org/diasdavid/node-libp2p.svg?style=flat-square)](https://david-dm.org/diasdavid/node-libp2p) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Node.js implementation of libp2p

## Interface

> **This is a work in progress, interface might change at anytime**

libp2p expects a [Record Store interface](https://github.com/diasdavid/abstract-record-store), a swarm and one or more Peer Routers that implement the [Peer Routing](https://github.com/diasdavid/abstract-peer-routing), the goal is to keep simplicity and plugability while the remaining modules execute the heavy lifting.

### Setting everything up

```
var libp2p = require('libp2p')
```

### Dialing and listening

libp2p.swarm.dialStream(peerInfo, protocol, options, function (err, stream) {})
libp2p.swarm.handleProtocol(protocol, options, handlerFunction)

### Using Peer Routing

libp2p.routing.findPeers(key, function (err, peerInfos) {})

### Using Records

libp2p.record.get(key, function (err, records) {})
libp2p.record.store(key, record)

### Stats



## Notes

Img for ref (till we get a better graph)

![](https://cloud.githubusercontent.com/assets/1211152/9450620/a02e3a9c-4aa1-11e5-83fd-cd996a0a4b6f.png)
