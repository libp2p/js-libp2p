libp2p-ping JavaScript Implementation
=====================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freejs-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> IPFS ping protocol JavaScript implementation

## Usage


```javascript
var Ping = require('libp2p-ping')

Ping.pingEcho(swarm) // Enable this peer to echo Ping requests

var p = new Ping(swarm, peerDst) // Ping peerDst, peerDst must be a ipfs-peer object

p.on('ping', function (time) {
  console.log(time + 'ms')
  p.stop() // stop sending pings
})
```
