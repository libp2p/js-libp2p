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

const mdns = new MDNS(options)

mdns.on('peer', (peerInfo) => {
  console.log('Found a peer in the local network', peerInfo.id.toB58String())
})

// Broadcast for 20 seconds
mdns.start(() => setTimeout(() => mdns.stop(() => {}), 20 * 1000))
```

- options
  - `peerInfo` - PeerInfo to announce
  - `broadcast` - (true/false) announce our presence through mDNS, default false
  - `interval` - query interval, default 10 * 1000 (10 seconds)
  - `serviceTag` - name of the service announce , default 'ipfs.local`

# MDNS messages

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
