# @libp2p/kad-dht <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-kad-dht/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of the Kad-DHT for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Use in Node.js](#use-in-nodejs)
- [API](#api)
  - [Custom secondary DHT in libp2p](#custom-secondary-dht-in-libp2p)
  - [Peer Routing](#peer-routing)
  - [Content Routing](#content-routing)
  - [Peer Discovery](#peer-discovery)
- [Spec](#spec)
- [Contribute](#contribute)
- [License](#license)
- [Contribute](#contribute-1)

## Install

```console
$ npm i @libp2p/kad-dht
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
import { create } from '@libp2p/kad-dht'

/**
 * @param {Libp2p} libp2p
 */
async function addDHT(libp2p) {
    const customDHT = create({
        libp2p,
        protocolPrefix: '/custom'
    })
    await customDHT.start()

    return customDHT
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

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-kad-dht/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
