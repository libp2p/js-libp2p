node-libp2p-railing
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)  ![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square) [![Dependency Status](https://david-dm.org/diasdavid/node-libp2p-railing.svg?style=flat-square)](https://david-dm.org/diasdavid/node-libp2p-railing) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Node.js libp2p Implementation of the railing process of a Node through a bootstrap peer list

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
