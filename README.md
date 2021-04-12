js-libp2p-bootstrap
=================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap)
[![](https://img.shields.io/travis/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-bootstrap)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-orange.svg?style=flat-square)

> JavaScript libp2p Implementation of the railing process of a Node through a bootstrap peer list

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Usage

```JavaScript
const Libp2p = require('libp2p')
const Bootstrap = require('libp2p-bootstrap')
const TCP = require('libp2p-tcp')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

let options = {
    modules: {
        transport: [ TCP ],
        peerDiscovery: [ Bootstrap ],
        streamMuxer: [ MPLEX ],
        encryption: [ NOISE ]
    },
    config: {
        peerDiscovery: {
            [Bootstrap.tag]: {
                list: [ // a list of bootstrap peer multiaddrs to connect to on node startup
                  "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
                  "/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                  "/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa" 
                  ],
                  interval: 5000 // default is 10 ms,
                  enabled: true
            }
        }
    }
}

async function start () {
  let libp2p = await Libp2p.create(options)

  libp2p.on('peer:discovery', function (peerId) {
    console.log('found peer: ', peerId.toB58String())
  })

  await libp2p.start()

}

start()
```
