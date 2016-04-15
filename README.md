js-libp2p-railing
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/diasdavid/js-libp2p-railing/badge.svg?branch=master)](https://coveralls.io/github/diasdavid/js-libp2p-railing?branch=master)
[![Travis CI](https://travis-ci.org/diasdavid/js-libp2p-railing.svg?branch=master)](https://travis-ci.org/diasdavid/js-libp2p-railing)
[![Circle CI](https://circleci.com/gh/diasdavid/js-libp2p-railing.svg?style=svg)](https://circleci.com/gh/diasdavid/js-libp2p-railing)
[![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-railing.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-railing) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript libp2p Implementation of the railing process of a Node through a bootstrap peer list

## Usage

```JavaScript
var Bootstrap = require('ipfs-libp2p')

var options = {
  verify: true // to verify that we can indeed open a connection to that peer, before declaring it as peer found
}

var peerList = <your custom peerList> || Bootstrap.default

var b = new Bootstrap(Bootstrap.default, options, swarm)

b.on('peer', function (peerInfo) {
  // found a new peer
})
```
