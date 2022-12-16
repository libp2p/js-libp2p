# @libp2p/peer-id-factory <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-peer-id.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-id)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-peer-id/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-peer-id/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Create PeerId instances

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Description](#description)
- [Example](#example)
- [API Docs](#api-docs)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/peer-id-factory
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPeerIdFactory` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/peer-id-factory/dist/index.min.js"></script>
```

## Description

Generate, import, and export PeerIDs, for use with [IPFS](https://github.com/ipfs/ipfs).

A Peer ID is the SHA-256 [multihash](https://github.com/multiformats/multihash) of a public key.

The public key is a base64 encoded string of a protobuf containing an RSA DER buffer. This uses a node buffer to pass the base64 encoded public key protobuf to the multihash for ID generation.

## Example

```JavaScript
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

const peerId = await createEd25519PeerId()
console.log(id.toString())
```

```bash
12D3KooWRm8J3iL796zPFi2EtGGtUJn58AG67gcqzMFHZnnsTzqD
```

## API Docs

- <https://libp2p.github.io/js-libp2p-peer-id/modules/_libp2p_peer_id_factory.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
