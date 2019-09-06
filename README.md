js-libp2p-floodsub
==================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-floodsub/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-floodsub?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-floodsub.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-floodsub)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-floodsub.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-floodsub)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![](https://img.shields.io/badge/pm-waffle-yellow.svg?style=flat-square)](https://waffle.io/libp2p/js-libp2p-floodsub)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
> npm install libp2p-floodsub
```

## Examples

```JavaScript
const FloodSub = require('libp2p-floodsub')

const fsub = new FloodSub(node)

fsub.start((err) => {
  if (err) {
    console.log('Upsy', err)
  }
  fsub.on('fruit', (data) => {
    console.log(data)
  })
  fsub.subscribe('fruit')

  fsub.publish('fruit', new Buffer('banana'))
})
```

## Events

Floodsub emits two kinds of events:
1. `<topic>` when a message is received for a particular topic
  ```Javascript
    fsub.on('fruit', (data) => { ... })
  ```
  - `data`: a Buffer containing the data that was published to the topic
2. `floodsub:subscription-change` when the local peer receives an update to the subscriptions of a remote peer.
  ```Javascript
    fsub.on('floodsub:subscription-change', (peerInfo, topics, changes) => { ... })
  ```
  - `peerInfo`: a [PeerInfo](https://github.com/libp2p/js-peer-info) object
  - `topics`: the topics that the peer is now subscribed to
  - `changes`: an array of `{ topicID: <topic>, subscribe: <boolean> }`
     eg `[ { topicID: 'fruit', subscribe: true }, { topicID: 'vegetables': false } ]`


## API

### Create a floodsub implementation

```js
const options = {…}
const floodsub = new Floodsub(libp2pNode, options)
```

Options is an optional object with the following key-value pairs:

* **`emitSelf`**: boolean identifying whether the node should emit to self on publish, in the event of the topic being subscribed (defaults to **false**).

For more, see https://libp2p.github.io/js-libp2p-floodsub

## Contribute

PRs are welcome!

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © David Dias
