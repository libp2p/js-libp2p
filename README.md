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

> libp2p-pubsub is the base protocol for libp2p pubsub implementations. This module is responsible for registering the protocol with libp2p, as well as managing the logic regarding pubsub connections with other peers.

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
> npm install libp2p-pubsub
```

## Usage

`libp2p-pubsub` abstracts the implementation protocol registration within `libp2p` and takes care of all the protocol connections. This way, a pubsub implementation can focus on its routing algorithm, instead of also needing to create the setup for it.

A pubsub implementation **MUST** override the `_processMessages`, `publish`, `subscribe`, `unsubscribe` and `getTopics` functions.

Other functions, such as `_onPeerConnected`, `_onPeerDisconnected`, `_addPeer`, `_removePeer`, `start` and `stop` may be overwritten if the pubsub implementation needs to customize their logic. Implementations overriding  `start` and `stop` **MUST** call `super`. The `start` function is responsible for registering the pubsub protocol with libp2p, while the `stop` function is responsible for unregistering the pubsub protocol and closing pubsub connections.

All the remaining functions **MUST NOT** be overwritten.

The following example aims to show how to create your pubsub implementation extending this base protocol. The pubsub implementation will handle the subscriptions logic.

TODO: add explanation for registrar!

```JavaScript
const Pubsub = require('libp2p-pubsub')

class PubsubImplementation extends Pubsub {
  constructor({ peerId, registrar, ...options })
    super({
      debugName: 'libp2p:pubsub',
      multicodecs: '/pubsub-implementation/1.0.0',
      peerId: peerId,
      registrar: registrar,
      signMessages: options.signMessages,
      strictSigning: options.strictSigning
    })
  }

  _processMessages(idB58Str, conn, peer) {
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

  getTopics() {
    // Required to be implemented by the subclass
  }
}
```

## API

The following specified API should be the base API for a pubsub implementation on top of `libp2p`.

### Start

Starts the pubsub subsystem. The protocol will be registered to `libp2p`, which will result in pubsub being notified when peers who support the protocol connect/disconnect to `libp2p`.

#### `pubsub.start()`

##### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | resolves once pubsub starts |

### Stop

Stops the pubsub subsystem. The protocol will be unregistered from `libp2p`, which will remove all listeners for the protocol and the established connections will be closed.

#### `pubsub.stop()`

##### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | resolves once pubsub stops |

### Publish

Publish data messages to pubsub topics.

#### `pubsub.publish(topics, messages)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| topics | `Array<string>|string` | set of pubsub topics |
| messages | `Array<any>|any` | set of messages to publish |

##### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | resolves once messages are published to the network |

### Subscribe

Subscribe to the given topic(s).

#### `pubsub.subscribe(topics)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| topics | `Array<string>|string` | set of pubsub topics |

### Unsubscribe

Unsubscribe from the given topic(s).

#### `pubsub.unsubscribe(topics)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| topics | `Array<string>|string` | set of pubsub topics |

### Get Topics

Get the list of topics which the peer is subscribed to.

#### `pubsub.getTopics()`

##### Returns

| Type | Description |
|------|-------------|
| `Array<String>` | Array of subscribed topics |

### Get Peers Subscribed to a topic

Get a list of the [PeerId](https://github.com/libp2p/js-peer-id) strings that are subscribed to one topic.

#### `pubsub.getSubscribers(topic)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | pubsub topic |

##### Returns

| Type | Description |
|------|-------------|
| `Array<string>` | Array of base-58 PeerId's |

### Validate

Validates the signature of a message.

#### `pubsub.validate(message)`

##### Parameters

| Name | Type | Description |
|------|------|-------------|
| message | `Message` | a pubsub message |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Boolean>` | resolves to true if the message is valid |

## Implementations using this base protocol

You can use the following implementations as examples for building your own pubsub implementation.

- [libp2p/js-libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub)
- [ChainSafe/js-libp2p-gossipsub](https://github.com/ChainSafe/js-libp2p-gossipsub)

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-pubsub/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

## License

Copyright (c) Protocol Labs, Inc. under the **MIT License**. See [LICENSE file](./LICENSE) for details.
