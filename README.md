# @libp2p/kad-dht <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-kad-dht/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-kad-dht/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> JavaScript implementation of the Kad-DHT for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
  - [Use in Node.js](#use-in-nodejs)
- [API](#api)
  - [Custom secondary DHT in libp2p](#custom-secondary-dht-in-libp2p)
  - [Peer Routing](#peer-routing)
  - [Content Routing](#content-routing)
  - [Peer Discovery](#peer-discovery)
- [Spec](#spec)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/kad-dht
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pKadDht` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/kad-dht/dist/index.min.js"></script>
```

```sh
> npm i @libp2p/kad-dht
```

### Use in Node.js

```js
import { create } from '@libp2p/kad-dht'
```

## API

See <https://libp2p.github.io/js-libp2p-kad-dht> for the auto generated docs.

The libp2p-kad-dht module offers 3 APIs: Peer Routing, Content Routing and Peer Discovery.

### Custom secondary DHT in libp2p

```js
import { createLibp2pNode } from 'libp2p'
import { kadDHT } from '@libp2p/kad-dht'

const node = await createLibp2pNode({
  dht: kadDHT()
  //... other config
})
await node.start()

for await (const event of node.dht.findPeer(node.peerId)) {
  console.info(event)
}
```

Note that you may want to supply your own peer discovery function and datastore

### Peer Routing

[![](https://raw.githubusercontent.com/libp2p/interface-peer-routing/master/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/peer-routing)

### Content Routing

[![](https://raw.githubusercontent.com/libp2p/interface-content-routing/master/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/content-routing)

### Peer Discovery

[![](https://github.com/libp2p/interface-peer-discovery/blob/master/img/badge.png?raw=true)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/peer-discovery)

## Spec

js-libp2p-kad-dht follows the [libp2p/kad-dht spec](https://github.com/libp2p/specs/tree/master/kad-dht) and implements the algorithms described in the [IPFS DHT documentation](https://docs.ipfs.io/concepts/dht/).

## API Docs

- <https://libp2p.github.io/js-libp2p-kad-dht>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
