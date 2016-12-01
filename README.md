libp2p-ping JavaScript Implementation
=====================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-ping/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-ping?branch=master)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-ping.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-ping)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-ping.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-ping)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-ping.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-ping)

> IPFS ping protocol JavaScript implementation

## Usage

```javascript
var Ping = require('libp2p-ping')

Ping.mount(swarm) // Enable this peer to echo Ping requests

var p = new Ping(swarm, peerDst) // Ping peerDst, peerDst must be a peer-info object

p.on('ping', function (time) {
  console.log(time + 'ms')
  p.stop() // stop sending pings
})
```
