# @libp2p/mdns <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-mdns/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-mdns/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Node.js libp2p mDNS discovery implementation for peer discovery

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [MDNS messages](#mdns-messages)
- [API Docs](#api-docs)
- [License](#license)
- [Contribute](#contribute)

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

```js
{
  type: 'query',
  questions: [ { name: 'ipfs.local', type: 'PTR' } ]
}
```

When a query is detected, each IPFS node sends an answer about itself

```js
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

## API Docs

- <https://libp2p.github.io/js-libp2p-mdns>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
