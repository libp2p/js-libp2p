libp2p-mdns JavaScript implementation
===============================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-mdns-discovery/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-mdns-discovery?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-mdns-discovery.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-mdns-discovery)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-mdns-discovery.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-mdns-discovery)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-mdns-discovery.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns-discovery) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Node.js libp2p mDNS discovery implementation

# Usage

```JavaScript
var MulticastDNS = require('libp2p-mdns')

var mdns = new MulticastDNS(libp2pNodeInstance, options)

mdns.on('peer', (peerInfo) => {
  console.log('Found a peer in the local network', peerInfo.id.toB58String())
})
```

- options
  - `broadcast` - (true/false) announce our presence through mDNS
  - `interval` - query interval
  - `serviceTag` - name of the service announced
  - `verify` - Verifies if we can establish a connection with the peer, before emitting a `peer` event
