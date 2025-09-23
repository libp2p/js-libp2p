# js-libp2p-gossipsub

[![](https://img.shields.io/badge/made%20by-ChainSafe-blue.svg?style=flat-square)](https://chainsafe.io/)
[![Travis CI](https://flat.badgen.net/travis/ChainSafe/gossipsub-js)](https://travis-ci.com/ChainSafe/gossipsub-js)
![ES Version](https://img.shields.io/badge/ES-2017-yellow)
![Node Version](https://img.shields.io/badge/node-10.x-green)

## Table of Contents

- [js-libp2p-gossipsub](#js-libp2p-gossipsub)
  - [Lead Maintainer](#lead-maintainer)
  - [Table of Contents](#table-of-contents)
  - [Specs](#specs)
  - [Install](#install)
  - [Usage](#usage)
  - [API](#api)
    - [Create a gossipsub implementation](#create-a-gossipsub-implementation)
  - [Contribute](#contribute)
  - [License](#license)

## Specs

Gossipsub is an implementation of pubsub based on meshsub and floodsub. You can read the specification [here](https://github.com/libp2p/specs/tree/master/pubsub/gossipsub).

`libp2p-gossipsub` currently implements the [`v1.1`](https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/gossipsub-v1.1.md) of the spec.

## Install

`npm install @chainsafe/libp2p-gossipsub`

## Usage

```javascript
import { gossipsub } from '@chainsafe/libp2p-gossipsub'


const libp2p = await createLibp2p({
  // ...
  services: {
    pubsub: gossipsub(options)
  }
});

libp2p.services.pubsub.addEventListener('message', (message) => {
  console.log(`${message.detail.topic}:`, new TextDecoder().decode(message.detail.data))
})

libp2p.services.pubsub.subscribe('fruit')

libp2p.services.pubsub.publish('fruit', new TextEncoder().encode('banana'))
```

## API

### Create a gossipsub implementation

```js
const options = {…}
const gossipsub = gossipsub(options)(libp2p)
```

Options is an optional object with the following key-value pairs:

- **`emitSelf`**: boolean identifying whether the node should emit to self on publish, in the event of the topic being subscribed (defaults to **false**).
- **`gossipIncoming`**: boolean identifying if incoming messages on a subscribed topic should be automatically gossiped (defaults to **true**).
- **`fallbackToFloodsub`**: boolean identifying whether the node should fallback to the floodsub protocol, if another connecting peer does not support gossipsub (defaults to **true**).
- **`floodPublish`**: boolean identifying if self-published messages should be sent to all peers, (defaults to **true**).
- **`doPX`**: boolean identifying whether PX is enabled; this should be enabled in bootstrappers and other well connected/trusted nodes (defaults to **false**).
- **`msgIdFn`**: a function with signature `(message) => string` defining the message id given a message, used internally to deduplicate gossip (defaults to `(message) => message.from + message.seqno.toString('hex')`)
- **`signMessages`**: boolean identifying if we want to sign outgoing messages or not (default: `true`)
- **`strictSigning`**: boolean identifying if message signing is required for incoming messages or not (default: `true`)
- **`messageCache`**: optional, a customized `MessageCache` instance, see the implementation for the interface.
- **`scoreParams`**: optional, a customized peer score parameters Object.
- **`scoreThresholds`**: optional, a customized peer score thresholds Object.
- **`directPeers`**: optional, an array of `AddrInfo` of peers with which we will maintain direct connections.

For the remaining API, see [@libp2p/interface-pubsub](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/interface-pubsub).

## Contribute

This module is actively under development. Please check out the issues and submit PRs!

## License

MIT © ChainSafe Systems
