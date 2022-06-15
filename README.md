# @libp2p/floodsub <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-floodsub)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-floodsub/actions/workflows/js-test-and-release.yml)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [Create a floodsub implementation](#create-a-floodsub-implementation)
- [Events](#events)
- [Contribute](#contribute)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/floodsub
```

## Usage

```JavaScript
import { FloodSub } from '@libp2p/floodsub'

// registrar is provided by libp2p
const fsub = new FloodSub(peerId, registrar, options)

await fsub.start()

fsub.on('fruit', (data) => {
  console.log(data)
})
fsub.subscribe('fruit')

fsub.publish('fruit', new TextEncoder().encode('banana'))
```

## API

### Create a floodsub implementation

```js
const options = {…}
const floodsub = new Floodsub(peerId, registrar, options)
```

Options is an optional object with the following key-value pairs:

- **`emitSelf`**: boolean identifying whether the node should emit to self on publish, in the event of the topic being subscribed (defaults to **false**).

For the remaining API, see <https://github.com/libp2p/js-libp2p-pubsub>

## Events

Floodsub emits two kinds of events:

1. `<topic>` when a message is received for a particular topic

```Javascript
  fsub.on('fruit', (data) => { ... })
```

- `data`: a Uint8Array containing the data that was published to the topic

2. `floodsub:subscription-change` when the local peer receives an update to the subscriptions of a remote peer.

```Javascript
  fsub.on('floodsub:subscription-change', (peerId, topics, changes) => { ... })
```

- `peerId`: a [PeerId](https://github.com/libp2p/js-peer-id) object
- `topics`: the topics that the peer is now subscribed to
- `changes`: an array of `{ topicID: <topic>, subscribe: <boolean> }`
  eg `[ { topicID: 'fruit', subscribe: true }, { topicID: 'vegetables': false } ]`

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-pubsub/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
