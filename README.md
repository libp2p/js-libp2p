js-libp2p-railing
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-railing/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-railing?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-railing.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-railing)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-railing.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-railing)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-railing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-railing)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript libp2p Implementation of the railing process of a Node through a bootstrap peer list

## Usage

```JavaScript
const Railing = require('libp2p-railing')

const b = new Railing(<peer-list>)

b.on('peer', function (peerInfo) {
  // found a new peer
})

b.start()
```
