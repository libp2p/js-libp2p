js-libp2p-pubsub
==================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-pubsub/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-pubsub?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-pubsub.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-pubsub)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-pubsub.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-pubsub)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-pubsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-pubsub) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![](https://img.shields.io/badge/pm-waffle-yellow.svg?style=flat-square)](https://waffle.io/libp2p/js-libp2p-pubsub)

> libp2p-pubsub consits on the base protocol for libp2p pubsub implementation. This module is responsible for all the logic regarding peer connections.

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
> npm install libp2p-pubsub
```

## Usage

A pubsub implementation **MUST** override the `_processConnection`, `publish`, `subscribe` and `unsubscribe` functions.

Other functions, such as `_addPeer`, `_removePeer`, `_onDial`, `start` and `stop` may be overwritten if the pubsub implementation needs to add custom logic on them. It is important pointing out that `start` and `stop` **must** call `super`. The `start` function is responsible for mounting the pubsub protocol onto the libp2p node and sending its' subscriptions to every peer connected, while the `stop` function is responsible for unmounting the pubsub protocol and shutting down every connection

All the remaining functions **MUST NOT** be overwritten.

The following example aims to show how to create your pubsub implementation extending this base protocol. The pubsub implementation will handle the subscriptions logic.

```JavaScript
const Pubsub = require('libp2p-pubsub')

class PubsubImplementation extends Pubsub {
  constructor(libp2p) {
    super('libp2p:pubsub', '/pubsub-implementation/1.0.0', libp2p)
  }

  _processConnection(idB58Str, conn, peer) {
    // Required to be implemented by the subclass
    // Process each message accordingly
  }

  publish() {
    // Required to be implemented by the subclass
  }

  subscribe() {
    // Required to be implemented by the subclass
  }

  unsubscribe() {
    // Required to be implemented by the subclass
  }
}
```

### Validate

Validates the signature of a message.

#### `pubsub.validate(message, callback)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| message | `Message` | a pubsub message |
| callback | `function(Error, Boolean)` | calls back with true if the message is valid |

## Implementations using this base protocol

You can use the following implementations as examples for building your own pubsub implementation.

- [libp2p/js-libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub)
- [ChainSafe/gossipsub-js](https://github.com/ChainSafe/gossipsub-js)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-pubsub/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

Copyright (c) Protocol Labs, Inc. under the **MIT License**. See [LICENSE file](./LICENSE) for details.
