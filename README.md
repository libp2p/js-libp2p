node-ipfs-mdns
==============

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> Node.js IPFS mDNS discovery implementation

# Usage 

```
var Sonar = require('ipfs-mdns')

var snr = new Sonar(peer, options, swarm)

snr.on('peer', function (peerFound) {
  console.log('Found a local peer', peerFound.id.toB58String())
})
```

- peer - The peer that represents itself. Must be of a type ipfs-peer
- swarm - swarm, needed in order to verify if we are able to establish a connection with the other peer
- options 
  - `broadcast` - (true/false) announce our presence through mDNS
  - `interval` - query interval
  - `serviceTag` - name of the service announced (default to "discovery.ipfs.io.local")
  - `verify` - Verifies if we can establish a connection with the peer, before emitting a `peer` event
