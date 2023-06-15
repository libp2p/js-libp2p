# @libp2p/interface-pubsub <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> PubSub interface for libp2p

## Table of contents <!-- omit in toc -->

- - [Install](#install)
- [Table of Contents <!-- omit in toc -->](#table-of-contents----omit-in-toc---)
  - [Implementations using this interface](#implementations-using-this-interface)
  - [Interface usage](#interface-usage)
    - [Extend interface](#extend-interface)
    - [Example](#example)
  - [API](#api)
    - [Constructor](#constructor)
      - [`new Pubsub({options})`](#new-pubsuboptions)
        - [Parameters](#parameters)
    - [Start](#start)
      - [`pubsub.start()`](#pubsubstart)
    - [Stop](#stop)
      - [`pubsub.stop()`](#pubsubstop)
    - [Publish](#publish)
      - [`pubsub.publish(topic, message)`](#pubsubpublishtopic-message)
        - [Parameters](#parameters-1)
        - [Returns](#returns)
    - [Subscribe](#subscribe)
      - [`pubsub.subscribe(topic)`](#pubsubsubscribetopic)
        - [Parameters](#parameters-2)
    - [Unsubscribe](#unsubscribe)
      - [`pubsub.unsubscribe(topic)`](#pubsubunsubscribetopic)
        - [Parameters](#parameters-3)
    - [Get Topics](#get-topics)
      - [`pubsub.getTopics()`](#pubsubgettopics)
        - [Returns](#returns-1)
    - [Get Peers Subscribed to a topic](#get-peers-subscribed-to-a-topic)
      - [`pubsub.getSubscribers(topic)`](#pubsubgetsubscriberstopic)
        - [Parameters](#parameters-4)
        - [Returns](#returns-2)
    - [Validate](#validate)
      - [`pubsub.validate(message)`](#pubsubvalidatemessage)
        - [Parameters](#parameters-5)
      - [Returns](#returns-3)
  - [Test suite usage](#test-suite-usage)
  - [API Docs](#api-docs)
  - [License](#license)
  - [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-pubsub
```

The `interface-pubsub` contains the base implementation for a libp2p pubsub router implementation. This interface should be used to implement a pubsub router compatible with libp2p. It includes a test suite that pubsub routers should run, in order to ensure compatibility with libp2p.

# Table of Contents <!-- omit in toc -->

- [Implementations using this interface](#implementations-using-this-interface)
- [Interface usage](#interface-usage)
  - [Extend interface](#extend-interface)
  - [Example](#example)
- [API](#api)
  - [Constructor](#constructor)
    - [`new Pubsub({options})`](#new-pubsuboptions)
      - [Parameters](#parameters)
  - [Start](#start)
    - [`pubsub.start()`](#pubsubstart)
  - [Stop](#stop)
    - [`pubsub.stop()`](#pubsubstop)
  - [Publish](#publish)
    - [`pubsub.publish(topic, message)`](#pubsubpublishtopic-message)
      - [Parameters](#parameters-1)
      - [Returns](#returns)
  - [Subscribe](#subscribe)
    - [`pubsub.subscribe(topic)`](#pubsubsubscribetopic)
      - [Parameters](#parameters-2)
  - [Unsubscribe](#unsubscribe)
    - [`pubsub.unsubscribe(topic)`](#pubsubunsubscribetopic)
      - [Parameters](#parameters-3)
  - [Get Topics](#get-topics)
    - [`pubsub.getTopics()`](#pubsubgettopics)
      - [Returns](#returns-1)
  - [Get Peers Subscribed to a topic](#get-peers-subscribed-to-a-topic)
    - [`pubsub.getSubscribers(topic)`](#pubsubgetsubscriberstopic)
      - [Parameters](#parameters-4)
      - [Returns](#returns-2)
  - [Validate](#validate)
    - [`pubsub.validate(message)`](#pubsubvalidatemessage)
      - [Parameters](#parameters-5)
    - [Returns](#returns-3)
- [Test suite usage](#test-suite-usage)
- [License](#license)
  - [Contribution](#contribution)

## Implementations using this interface

You can check the following implementations as examples for building your own pubsub router.

- [libp2p/js-libp2p-floodsub](https://github.com/libp2p/js-libp2p-floodsub)
- [ChainSafe/js-libp2p-gossipsub](https://github.com/ChainSafe/js-libp2p-gossipsub)

## Interface usage

`interface-pubsub` abstracts the implementation protocol registration within `libp2p` and takes care of all the protocol connections and streams, as well as the subscription management and the features describe in the libp2p [pubsub specs](https://github.com/libp2p/specs/tree/master/pubsub). This way, a pubsub implementation can focus on its message routing algorithm, instead of also needing to create the setup for it.

### Extend interface

A pubsub router implementation should start by extending the `interface-pubsub` class and **MUST** override the `_publish` function, according to the router algorithms. This function is responsible for forwarding publish messages to other peers, as well as forwarding received messages if the router provides the `canRelayMessage` option to the base implementation.

Other functions, such as `start`, `stop`, `subscribe`, `unsubscribe`, `_encodeRpc`, `_decodeRpc`, `_processRpcMessage`, `_addPeer` and `_removePeer` may be overwritten if the pubsub implementation needs to customize their logic. Implementations overriding these functions **MUST** call `super`.

The `start` and `stop` functions are responsible for the registration of the pubsub protocol with libp2p. The `stop` function also guarantees that the open streams in the protocol are properly closed.

The `subscribe` and `unsubscribe` functions take care of the subscription management and its inherent message propagation.

When using a custom protobuf definition for message marshalling, you should override `_encodeRpc` and `_decodeRpc` to use the new protobuf instead of the default one.

`_processRpcMessage` is responsible for handling messages received from other peers. This should be extended if further operations/validations are needed by the router.

The `_addPeer` and `_removePeer` functions are called when new peers running the pubsub router protocol establish a connection with the peer. They are used for tracking the open streams between the peers.

All the remaining functions **MUST NOT** be overwritten.

### Example

The following example aims to show how to create your pubsub implementation extending this base protocol. The pubsub implementation will handle the subscriptions logic.

```JavaScript
const Pubsub = require('libp2p-interfaces/src/pubsub')

class PubsubImplementation extends Pubsub {
  constructor({ libp2p, options })
    super({
      debugName: 'libp2p:pubsub',
      multicodecs: '/pubsub-implementation/1.0.0',
      libp2p,
      globalSigningPolicy: options.globalSigningPolicy
    })
  }

  _publish (message) {
    // Required to be implemented by the subclass
    // Routing logic for the message
  }
}
```

## API

The interface aims to specify a common interface that all pubsub router implementation should follow. A pubsub router implementation should extend the [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter). When peers receive pubsub messages, these messages will be emitted by the event emitter where the `eventName` will be the `topic` associated with the message.

### Constructor

The base class constructor configures the pubsub instance for use with a libp2p instance. It includes settings for logging, signature policies, etc.

#### `new Pubsub({options})`

##### Parameters

| Name                          | Type                             | Description                                     | Default              |
| ----------------------------- | -------------------------------- | ----------------------------------------------- | -------------------- |
| options.libp2p                | `Libp2p`                         | libp2p instance                                 | required, no default |
| options.debugName             | `string`                         | log namespace                                   | required, no default |
| options.multicodecs           | `string \| Array<string>`        | protocol identifier(s)                          | required, no default |
| options.globalSignaturePolicy | `'StrictSign' \| 'StrictNoSign'` | signature policy to be globally applied         | `'StrictSign'`       |
| options.canRelayMessage       | `boolean`                        | if can relay messages if not subscribed         | `false`              |
| options.emitSelf              | `boolean`                        | if `publish` should emit to self, if subscribed | `false`              |

### Start

Starts the pubsub subsystem. The protocol will be registered to `libp2p`, which will result in pubsub being notified when peers who support the protocol connect/disconnect to `libp2p`.

#### `pubsub.start()`

### Stop

Stops the pubsub subsystem. The protocol will be unregistered from `libp2p`, which will remove all listeners for the protocol and the established connections will be closed.

#### `pubsub.stop()`

### Publish

Publish data message to pubsub topics.

#### `pubsub.publish(topic, message)`

##### Parameters

| Name    | Type         | Description        |
| ------- | ------------ | ------------------ |
| topic   | `string`     | pubsub topic       |
| message | `Uint8Array` | message to publish |

##### Returns

| Type            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `Promise<void>` | resolves once the message is published to the network |

### Subscribe

Subscribe to the given topic.

#### `pubsub.subscribe(topic)`

##### Parameters

| Name  | Type     | Description  |
| ----- | -------- | ------------ |
| topic | `string` | pubsub topic |

### Unsubscribe

Unsubscribe from the given topic.

#### `pubsub.unsubscribe(topic)`

##### Parameters

| Name  | Type     | Description  |
| ----- | -------- | ------------ |
| topic | `string` | pubsub topic |

### Get Topics

Get the list of topics which the peer is subscribed to.

#### `pubsub.getTopics()`

##### Returns

| Type            | Description                |
| --------------- | -------------------------- |
| `Array<String>` | Array of subscribed topics |

### Get Peers Subscribed to a topic

Get a list of the [PeerId](https://github.com/libp2p/js-peer-id) strings that are subscribed to one topic.

#### `pubsub.getSubscribers(topic)`

##### Parameters

| Name  | Type     | Description  |
| ----- | -------- | ------------ |
| topic | `string` | pubsub topic |

##### Returns

| Type            | Description               |
| --------------- | ------------------------- |
| `Array<string>` | Array of base-58 PeerId's |

### Validate

Validates a message according to the signature policy and topic-specific validation function.

#### `pubsub.validate(message)`

##### Parameters

| Name    | Type      | Description      |
| ------- | --------- | ---------------- |
| message | `Message` | a pubsub message |

#### Returns

| Type            | Description                      |
| --------------- | -------------------------------- |
| `Promise<void>` | resolves if the message is valid |

## Test suite usage

```js
'use strict'

const tests = require('libp2p-interfaces-compliance-tests/pubsub')
const YourPubsubRouter = require('../src')

describe('compliance', () => {
  let peers
  let pubsubNodes = []

  tests({
    async setup (number = 1, options = {}) {
      // Create number pubsub nodes with libp2p
      peers = await createPeers({ number })

      peers.forEach((peer) => {
        const ps = new YourPubsubRouter(peer, options)

        pubsubNodes.push(ps)
      })

      return pubsubNodes
    },
    async teardown () {
      // Clean up any resources created by setup()
      await Promise.all(pubsubNodes.map(ps => ps.stop()))
      peers.length && await Promise.all(peers.map(peer => peer.stop()))
    }
  })
})
```

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_pubsub.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
