libp2p-mdns JavaScript implementation
=====================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-mdns/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-mdns?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-mdns.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-mdns)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-mdns.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-mdns)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript libp2p MulticastDNS discovery implementation

# Usage

```JavaScript
const MDNS = require('libp2p-mdns')

const mdns = new MDNS(peerInfo, options)

mdns.on('peer', (peerInfo) => {
  console.log('Found a peer in the local network', peerInfo.id.toB58String())
})

// Broadcast for 20 seconds
mdns.start(() => setTimeout(() => mdns.stop(() => {}), 20 * 1000))
```

- options
  - `broadcast` - (true/false) announce our presence through mDNS
  - `interval` - query interval
  - `serviceTag` - name of the service announced
