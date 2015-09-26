node-libp2p
===========

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) ![Build Status](https://travis-ci.org/diasdavid/node-libp2p.svg?style=flat-square)](https://travis-ci.org/diasdavid/node-libp2p) ![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square) [![Dependency Status](https://david-dm.org/diasdavid/node-libp2p.svg?style=flat-square)](https://david-dm.org/diasdavid/node-libp2p) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Node.js implementation of libp2p

## Interface

> **This is a work in progress, interface might change at anytime**

libp2p expects a [Record Store interface](https://github.com/diasdavid/abstract-record-store), a swarm and one or more Peer Routers that implement the [Peer Routing](https://github.com/diasdavid/abstract-peer-routing), the goal is to keep simplicity and plugability while the remaining modules execute the heavy lifting.

libp2p becomes very simple and basically acts as a glue for every module that compose this library. Since it can be highly customized, it requires some setup. What we recommend is to have a libp2p build for the system you are developing taking into account in your needs (e.g. for a browser working version of libp2p that acts as the network layer of IPFS, we have a built and minified version that browsers can require)

### Setting everything up

```
var Libp2p = require('libp2p')

// set up a Swarm, Peer Routing and Record Store instances, the last two are optional

var p2p = new Libp2p(swarm, [peerRouting, recordStore])
```

### Dialing and listening

p2p.swarm.dial(peerInfo, options, protocol, function (err, stream) {})
p2p.swarm.handleProtocol(protocol, options, handlerFunction)

### Using Peer Routing

p2p.routing.findPeers(key, function (err, peerInfos) {})

### Using Records

p2p.record.get(key, function (err, records) {})
p2p.record.store(key, record)

### Stats



## Notes

Img for ref (till we get a better graph)

![](https://cloud.githubusercontent.com/assets/1211152/9450620/a02e3a9c-4aa1-11e5-83fd-cd996a0a4b6f.png)
