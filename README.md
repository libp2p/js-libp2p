# js-libp2p-kad-dht

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-kad-dht)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-kad-dht/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-kad-dht?branch=master)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht)
[![Bundle Size](https://flat.badgen.net/bundlephobia/minzip/libp2p-kad-dht)](https://bundlephobia.com/result?p=libp2p-kad-dht)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> JavaScript implementation of the Kademlia DHT for libp2p, based on [go-libp2p-kad-dht](https://github.com/libp2p/go-libp2p-kad-dht).

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Table of Contents

- [Install](#install)
  - [npm](#npm)
  - [Use in Node.js](#use-in-nodejs)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

### npm

```sh
> npm i libp2p-kad-dht
```

### Use in Node.js

```js
const KadDHT = require('libp2p-kad-dht')
```

## API

See https://libp2p.github.io/js-libp2p-kad-dht for the auto generated docs.

The libp2p-kad-dht module offers 3 APIs: Peer Routing, Content Routing and Peer Discovery.

### Custom secondary DHT in libp2p

```js
/**
 * @param {Libp2p} libp2p
 */
function addDHT(libp2p) {
    const customDHT = new KadDHT({
        libp2p,
        dialer: libp2p.dialer,
        peerId: libp2p.peerId,
        peerStore: libp2p.peerStore,
        registrar: libp2p.registrar,
        protocolPrefix: '/custom'
    })
    customDHT.start()
    customDHT.on('peer', libp2p._onDiscoveryPeer)
    return customDHT
}
```

Note that you may want to supply your own peer discovery function and datastore
### Peer Routing

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/src/peer-routing/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interfaces/src/peer-routing)

### Content Routing

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/src/content-routing/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interfaces/src/content-routing)

### Peer Discovery

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/src/peer-discovery/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interfaces/src/peer-discovery)

### Implementation Summary

A [summary](docs/IMPL_SUMMARY.MD) of the algorithms and API for this implementation of Kademlia.

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-ipfs/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

MIT - Protocol Labs 2017
