# js-libp2p-kad-dht <!-- omit in toc -->

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Build Status](https://github.com/libp2p/js-libp2p-kad-dht/actions/workflows/js-test-and-release.yml/badge.svg?branch=main)](https://github.com/libp2p/js-libp2p-kad-dht/actions/workflows/js-test-and-release.yml)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-kad-dht/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-kad-dht?branch=master)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht)
[![Bundle Size](https://flat.badgen.net/bundlephobia/minzip/libp2p-kad-dht)](https://bundlephobia.com/result?p=libp2p-kad-dht)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> JavaScript implementation of the Kademlia DHT for libp2p, based on [go-libp2p-kad-dht](https://github.com/libp2p/go-libp2p-kad-dht).

## Table of Contents  <!-- omit in toc -->

- [Install](#install)
  - [npm](#npm)
  - [Use in Node.js](#use-in-nodejs)
- [API](#api)
  - [Custom secondary DHT in libp2p](#custom-secondary-dht-in-libp2p)
  - [Peer Routing](#peer-routing)
  - [Content Routing](#content-routing)
  - [Peer Discovery](#peer-discovery)
- [Spec](#spec)
- [Contribute](#contribute)
- [License](#license)
  - [Contribution](#contribution)
## Install

### npm

```sh
> npm i @libp2p/kad-dht
```

### Use in Node.js

```js
import { create } from '@libp2p/kad-dht'
```

## API

See https://libp2p.github.io/js-libp2p-kad-dht for the auto generated docs.

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

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
