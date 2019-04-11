js-libp2p-bootstrap
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap)
[![](https://img.shields.io/travis/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-bootstrap)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D6.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D10.0.0-orange.svg?style=flat-square)

> JavaScript libp2p Implementation of the railing process of a Node through a bootstrap peer list

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Usage

```JavaScript
const bootstrap = require('libp2p-bootstrap')

const options = {
  list: <List of Multiaddrs>
  interval: 5000 // ms, default is 10s
}

const b = new bootstrap(options)

b.on('peer', function (peerInfo) {
  // found a new peer
})

b.start()
```
