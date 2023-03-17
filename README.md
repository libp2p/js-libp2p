# @libp2p/bootstrap <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-bootstrap/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-bootstrap/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Node.js IPFS Implementation of the railing process of a Node through a bootstrap peer list

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/bootstrap
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pBootstrap` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/bootstrap/dist/index.min.js"></script>
```

## Usage

The configured bootstrap peers will be discovered after the configured timeout. This will ensure
there are some peers in the peer store for the node to use to discover other peers.

They will be tagged with a tag with the name `'bootstrap'` tag, the value `50` and it will expire
after two minutes which means the nodes connections may be closed if the maximum number of
connections is reached.

Clients that need constant connections to bootstrap nodes (e.g. browsers) can set the TTL to `Infinity`.

```JavaScript
import { createLibp2p } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from 'libp2p/tcp'
import { noise } from '@libp2p/noise'
import { mplex } from '@libp2p/mplex'

let options = {
  transports: [
    tcp()
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ],
  peerDiscovery: [
    bootstrap({
      list: [ // a list of bootstrap peer multiaddrs to connect to on node startup
        "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa"
      ],
      timeout: 1000, // in ms,
      tagName: 'bootstrap',
      tagValue: 50,
      tagTTL: 120000 // in ms
    })
  ]
}

async function start () {
  let libp2p = await createLibp2p(options)

  libp2p.on('peer:discovery', function (peerId) {
    console.log('found peer: ', peerId.toB58String())
  })

  await libp2p.start()

}

start()
```

## API Docs

- <https://libp2p.github.io/js-libp2p-bootstrap>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
