node-ipfs-railing
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/) [![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)

> Node.js IPFS Implementation of the railing process of a Node through a bootstrap peer list

## Usage

```JavaScript
var Bootstrap = require('ipfs-railing')

var options = {
    verify: true // to verify that we can indeed open a connection to that peer, before declaring it as peer found 
}

var peerList = <your custom peerList> || Bootstrap.default

var b = new Bootstrap(Bootstrap.default, options, swarm)

b.on('peer', function (peer) {
  // found a new peer
})
```
