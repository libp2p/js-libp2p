# js-libp2p-floodsub <!-- omit in toc -->

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-floodsub/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-floodsub?branch=master)
[![Build Status](https://github.com/libp2p/js-libp2p-floodsub/actions/workflows/js-test-and-release.yml/badge.svg?branch=main)](https://github.com/libp2p/js-libp2p-floodsub/actions/workflows/js-test-and-release.yml)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![](https://img.shields.io/badge/pm-waffle-yellow.svg?style=flat-square)](https://waffle.io/libp2p/js-libp2p-floodsub)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).

## Table of Contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [Create a floodsub implementation](#create-a-floodsub-implementation)
- [Events](#events)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
> npm install @libp2p/floodsub
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

* **`emitSelf`**: boolean identifying whether the node should emit to self on publish, in the event of the topic being subscribed (defaults to **false**).

For the remaining API, see https://github.com/libp2p/js-libp2p-pubsub

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

[Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT) © Protocol Labs
