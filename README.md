# @libp2p/peer-collections <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-peer-collections.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-collections)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-peer-collections/actions/workflows/js-test-and-release.yml)

> Stores values against a peer id

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Description](#description)
- [Example](#example)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/peer-collections
```

## Description

We can't use PeerIds as collection keys because collection keys are compared using same-value-zero equality, so this is just a group of collections that stringifies PeerIds before storing them.

PeerIds cache stringified versions of themselves so this should be a cheap operation.

## Example

```JavaScript
import { peerMap, peerSet, peerList } from '@libp2p/peer-collections'

const map = peerMap<string>()
map.set(peerId, 'value')

const set = peerSet()
set.add(peerId)

const list = peerList()
list.push(peerId)
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
