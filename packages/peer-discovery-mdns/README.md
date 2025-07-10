# @libp2p/mdns

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Node.js libp2p mDNS discovery implementation for peer discovery

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

A peer discover mechanism that uses [mDNS](https://datatracker.ietf.org/doc/html/rfc6762) to discover peers on the local network.

## Example - Use with libp2p

```TypeScript
import { createLibp2p } from 'libp2p'
import { mdns } from '@libp2p/mdns'

const libp2p = await createLibp2p({
  peerDiscovery: [
    mdns()
  ]
})

libp2p.addEventListener('peer:discovery', (evt) => {
  libp2p.dial(evt.detail.multiaddrs) // dial discovered peers
  console.log('found peer: ', evt.detail.toString())
})
```

## MDNS messages

A query is sent to discover the libp2p nodes on the local network

```JSON
{
   "type": "query",
   "questions": [{
     "name": "_p2p._udp.local",
     "type": "PTR"
   }]
}
```

When a query is detected, each libp2p node sends an answer about itself

```JSON
[{
  "name": "_p2p._udp.local",
  "type": "PTR",
  "class": "IN",
  "ttl": 120,
  "data": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local"
}, {
  "name": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local",
  "type": "SRV",
  "class": "IN",
  "ttl": 120,
  "data": {
    "priority": 10,
    "weight": 1,
    "port": "20002",
    "target": "LAPTOP-G5LJ7VN9"
  }
}, {
  "name": "QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK._p2p._udp.local",
  "type": "TXT",
  "class": "IN",
  "ttl": 120,
  "data": ["QmNPubsDWATVngE3d5WDSNe7eVrFLuk38qb9t6vdLnu2aK"]
}, {
  "name": "LAPTOP-G5LJ7VN9",
  "type": "A",
  "class": "IN",
  "ttl": 120,
  "data": "127.0.0.1"
}, {
  "name": "LAPTOP-G5LJ7VN9",
  "type": "AAAA",
  "class": "IN",
  "ttl": 120,
  "data": "::1"
}]
```

# Install

```console
$ npm i @libp2p/mdns
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_mdns.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-discovery-mdns/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-discovery-mdns/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
