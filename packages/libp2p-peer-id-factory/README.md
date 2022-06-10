# @libp2p/peer-id-factory <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-peer-id/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-peer-id/actions/workflows/js-test-and-release.yml)

> Create PeerId instances

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Description](#description)
- [Example](#example)
- [License](#license)
  - [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/peer-id-factory
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

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
