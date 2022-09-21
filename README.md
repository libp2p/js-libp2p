# @libp2p/mdns <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-mdns/actions/workflows/js-test-and-release.yml)

> Node.js libp2p mDNS discovery implementation for peer discovery

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [MDNS messages](#mdns-messages)
- [Contribute](#contribute)
- [License](#license)
- [Contribute](#contribute-1)

## Install

```console
$ npm i @libp2p/mdns
```

## Usage

```JavaScript
import { MDNS } from '@libp2p/mdns'

const mdns = new MDNS(options)

mdns.on('peer', (peerData) => {
  console.log('Found a peer in the local network', peerData.id.toString(), peerData.multiaddrs)
})

// Broadcast for 20 seconds
mdns.start()
setTimeout(() => mdns.stop(), 20 * 1000)
```

- options
  - `peerId` - PeerId to announce
  - `multiaddrs` - multiaddrs to announce
  - `broadcast` - (true/false) announce our presence through mDNS, default `false`
  - `interval` - query interval, default 10 \* 1000 (10 seconds)
  - `serviceTag` - name of the service announce , default 'ipfs.local\`
  - `compat` - enable/disable compatibility with go-libp2p-mdns, default `true`

## MDNS messages

A query is sent to discover the IPFS nodes on the local network

    { type: 'query',
      questions: [ { name: 'ipfs.local', type: 'PTR' } ]
    }

When a query is detected, each IPFS node sends an answer about itself

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

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

- Go through the modules and **check out existing issues**. This is especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
- **Perform code reviews**. More eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
