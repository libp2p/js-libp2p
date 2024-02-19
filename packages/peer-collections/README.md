[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Stores values against a peer id

# About

We can't use PeerIds as collection keys because collection keys are compared using same-value-zero equality, so this is just a group of collections that stringifies PeerIds before storing them.

PeerIds cache stringified versions of themselves so this should be a cheap operation.

Tracked versions are also available which report their current size to the libp2p Metrics collector.

## Example - Peer lists

```TypeScript
import { peerList } from '@libp2p/peer-collections'

const list = peerList()
list.push(peerId)
```

## Example - Tracked peer lists

```TypeScript
import { trackedPeerList } from '@libp2p/peer-collections'
import { createLibp2p } from 'libp2p'

const libp2p = await createLibp2p()

const list = trackedPeerList({ name: 'my_metric_name', metrics: libp2p.metrics })
list.push(peerId)
```

## Example - Peer maps

```TypeScript
import { peerMap } from '@libp2p/peer-collections'

const map = peerMap<string>()
map.set(peerId, 'value')
```

## Example - Tracked peer maps

```TypeScript
import { trackedPeerMap } from '@libp2p/peer-collections'
import { createLibp2p } from 'libp2p'

const libp2p = await createLibp2p()

const list = trackedPeerMap({ name: 'my_metric_name', metrics: libp2p.metrics })
map.set(peerId, 'value')
```

## Example - Peer sets

```TypeScript
import { peerSet } from '@libp2p/peer-collections'

const set = peerSet()
set.add(peerId)
```

## Example - Tracked peer sets

```TypeScript
import { trackedPeerSet } from '@libp2p/peer-collections'
import { createLibp2p } from 'libp2p'

const libp2p = await createLibp2p()

const list = trackedPeerSet({ name: 'my_metric_name', metrics: libp2p.metrics })
map.add(peerId)
```

# Install

```console
$ npm i @libp2p/peer-collections
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPeerCollections` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/peer-collections/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_peer_collections.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
