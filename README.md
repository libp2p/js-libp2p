node-libp2p-mdns-discovery
==============

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> Node.js libp2p mDNS discovery implementation

# Usage 

```
var Sonar = require('libp2p-mdns-discovery')

var snr = new Sonar(peer, options, swarm)

snr.on('peer', function (peerInfo) {
  console.log('Found a peer in the local network', peerFound.id.toB58String())
})
```

- peer - The peer that represents itself. Must be of a type [peer-info](https://github.com/diasdavid/node-peer-info)
- swarm - swarm, needed in order to verify if we are able to establish a connection with the other peer
- options 
  - `broadcast` - (true/false) announce our presence through mDNS
  - `interval` - query interval
  - `serviceTag` - name of the service announced (default to "discovery.ipfs.io.local")
  - `verify` - Verifies if we can establish a connection with the peer, before emitting a `peer` event
