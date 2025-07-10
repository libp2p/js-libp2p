# @libp2p/kad-dht

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> JavaScript implementation of the Kad-DHT for libp2p

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

This module implements the [libp2p Kademlia spec](https://github.com/libp2p/specs/blob/master/kad-dht/README.md) in TypeScript.

The Kademlia DHT allow for several operations such as finding peers, searching for providers of DHT records, etc.

## Example - Using with libp2p

```TypeScript
import { kadDHT } from '@libp2p/kad-dht'
import { createLibp2p } from 'libp2p'
import { peerIdFromString } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  services: {
    dht: kadDHT({
      // DHT options
    }),
    ping: ping(),
    identify: identify()
  }
})

const peerId = peerIdFromString('QmFoo')
const peerInfo = await node.peerRouting.findPeer(peerId)

console.info(peerInfo) // peer id, multiaddrs
```

## Example - Connecting to the IPFS Amino DHT

The [Amino DHT](https://blog.ipfs.tech/2023-09-amino-refactoring/) is a public-good DHT used by IPFS to fetch content, find peers, etc.

If you are trying to access content on the public internet, this is the implementation you want.

```TypeScript
import { kadDHT, removePrivateAddressesMapper } from '@libp2p/kad-dht'
import { createLibp2p } from 'libp2p'
import { peerIdFromString } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  services: {
    aminoDHT: kadDHT({
      protocol: '/ipfs/kad/1.0.0',
      peerInfoMapper: removePrivateAddressesMapper
    }),
    ping: ping(),
    identify: identify()
  }
})

const peerId = peerIdFromString('QmFoo')
const peerInfo = await node.peerRouting.findPeer(peerId)

console.info(peerInfo) // peer id, multiaddrs
```

## Example - Connecting to a LAN-only DHT

This DHT only works with privately dialable peers.

This is for use when peers are on the local area network.

```TypeScript
import { kadDHT, removePublicAddressesMapper } from '@libp2p/kad-dht'
import { createLibp2p } from 'libp2p'
import { peerIdFromString } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  services: {
    lanDHT: kadDHT({
      protocol: '/ipfs/lan/kad/1.0.0',
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false
    }),
    ping: ping(),
    identify: identify()
  }
})

const peerId = peerIdFromString('QmFoo')
const peerInfo = await node.peerRouting.findPeer(peerId)

console.info(peerInfo) // peer id, multiaddrs
```

## Example - Connecting to both a LAN-only DHT and the IPFS Amino DHT

When using multiple DHTs, you should specify distinct datastore, metrics and
log prefixes to ensure that data is kept separate for each instance.

```TypeScript
import { kadDHT, removePublicAddressesMapper, removePrivateAddressesMapper } from '@libp2p/kad-dht'
import { createLibp2p } from 'libp2p'
import { peerIdFromString } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  services: {
    lanDHT: kadDHT({
      protocol: '/ipfs/lan/kad/1.0.0',
      peerInfoMapper: removePublicAddressesMapper,
      clientMode: false,
      logPrefix: 'libp2p:dht-lan',
      datastorePrefix: '/dht-lan',
      metricsPrefix: 'libp2p_dht_lan'
    }),
    aminoDHT: kadDHT({
      protocol: '/ipfs/kad/1.0.0',
      peerInfoMapper: removePrivateAddressesMapper,
      logPrefix: 'libp2p:dht-amino',
      datastorePrefix: '/dht-amino',
      metricsPrefix: 'libp2p_dht_amino'
    }),
    ping: ping(),
    identify: identify()
  }
})

const peerId = peerIdFromString('QmFoo')
const peerInfo = await node.peerRouting.findPeer(peerId)

console.info(peerInfo) // peer id, multiaddrs
```

# Install

```console
$ npm i @libp2p/kad-dht
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pKadDht` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/kad-dht/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_kad_dht.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/kad-dht/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/kad-dht/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
