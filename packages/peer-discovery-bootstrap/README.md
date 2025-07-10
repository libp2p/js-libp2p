# @libp2p/bootstrap

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Peer discovery via a list of bootstrap peers

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

The configured bootstrap peers will be discovered after the configured timeout. This will ensure there are some peers in the peer store for the node to use to discover other peers.

They will be tagged with a tag with the name `'bootstrap'` tag, the value `50` and it will expire after two minutes which means the nodes connections may be closed if the maximum number of connections is reached.

Clients that need constant connections to bootstrap nodes (e.g. browsers) can set the TTL to `Infinity`.

## Example - Configuring a list of bootstrap nodes

```TypeScript
import { createLibp2p } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'

const libp2p = await createLibp2p({
  peerDiscovery: [
    bootstrap({
      list: [
        // a list of bootstrap peer multiaddrs to connect to on node startup
        '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        '/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
      ]
    })
  ]
})

libp2p.addEventListener('peer:discovery', (evt) => {
  console.log('found peer: ', evt.detail.toString())
})
```

# Install

```console
$ npm i @libp2p/bootstrap
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pBootstrap` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/bootstrap/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_bootstrap.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-discovery-bootstrap/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/peer-discovery-bootstrap/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
