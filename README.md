# libp2p-peer-connections <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-peer-collections/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-peer-collections/actions/workflows/js-test-and-release.yml)

> store values against peer ids

## Table of Contents <!-- omit in toc -->

- [Description](#description)
- [Example](#example)
- [Installation](#installation)
- [License](#license)
  - [Contribution](#contribution)

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

## Installation

```console
$ npm i @libp2p/peer-collections
```

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
