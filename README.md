libp2p-mdns JavaScript implementation
=====================================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns)
[![](https://img.shields.io/travis/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-mdns)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript libp2p MulticastDNS discovery implementation

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Usage

```JavaScript
const MDNS = require('libp2p-mdns')

const mdns = new MDNS(options)

mdns.on('peer', (peerData) => {
  console.log('Found a peer in the local network', peerData.id.toB58String(), peerData.multiaddrs)
})

// Broadcast for 20 seconds
mdns.start()
setTimeout(() => mdns.stop(), 20 * 1000)
```

- options
  - `peerId` - PeerId to announce
  - `multiaddrs` - multiaddrs to announce
  - `broadcast` - (true/false) announce our presence through mDNS, default `false`
  - `interval` - query interval, default 10 * 1000 (10 seconds)
  - `serviceTag` - name of the service announce , default 'ipfs.local`
  - `compat` - enable/disable compatibility with go-libp2p-mdns, default `true`

## MDNS messages

A query is sent to discover the IPFS nodes on the local network

```
{ type: 'query',
  questions: [ { name: 'ipfs.local', type: 'PTR' } ]
}
```

When a query is detected, each IPFS node sends an answer about itself

```
[ { name: 'ipfs.local',
    type: 'PTR',
    class: 'IN',
    ttl: 120,
    data: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK.ipfs.local' },
  { name: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK.ipfs.local',
    type: 'SRV',
    class: 'IN',
    ttl: 120,
    data:
     { priority: 10,
       weight: 1,
       port: '20002',
       target: 'LAPTOP-G5LJ7VN9' } },
  { name: 'QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK.ipfs.local',
    type: 'TXT',
    class: 'IN',
    ttl: 120,
    data: ['QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK'] },
  { name: 'LAPTOP-G5LJ7VN9',
    type: 'A',
    class: 'IN',
    ttl: 120,
    data: '127.0.0.1' },
  { name: 'LAPTOP-G5LJ7VN9',
    type: 'AAAA',
    class: 'IN',
    ttl: 120,
    data: '::1' } ]
```
