# API

* [Static Functions](#static-functions)
  * [`create`](#create)
* [Instance Methods](#instance-methods)
  * [`start`](#start)
  * [`stop`](#stop)
  * [`dial`](#dial)
  * [`dialProtocol`](#dialProtocol)
  * [`hangUp`](#hangUp)
  * [`handle`](#handle)
  * [`unhandle`](#unhandle)
  * [`peerRouting.findPeer`](#peerRouting.findPeer)
  * [`contentRouting.findProviders`](#contentRouting.findProviders)
  * [`contentRouting.provide`](#contentRouting.provide)
  * [`_dht.put`](#_dht.put)
  * [`_dht.get`](#_dht.get)
  * [`_dht.getMany`](#_dht.getMany)
  * [`pubsub.getPeersSubscribed`](#pubsub.getPeersSubscribed)
  * [`pubsub.getTopics`](#pubsub.getTopics)
  * [`pubsub.publish`](#pubsub.publish)
  * [`pubsub.subscribe`](#pubsub.subscribe)

## Static Functions

### create

Creates an instance of Libp2p.

`create(options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| options | `Object` | libp2p options |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Libp2p>` | Promise resolves with the Libp2p instance |

#### Example

```js
const Libp2p = require('libp2p')

// specify options
const options = {}

// create libp2p
const libp2p = await Libp2p.create(options)
```

Note: It is important pointing out that with `create`, the `PeerInfo` option is not required and will be generated if it is not provided.

As an alternative, it is possible to create a Libp2p instance with the constructor:

#### Example

```js
const Libp2p = require('libp2p')

// specify options
const options = {}

// create libp2p
const libp2p = new Libp2p (options)
```

Required keys in the `options` object:

- `peerInfo`: instance of [PeerInfo][] that contains the [PeerId][], Keys and [multiaddrs][multiaddr] of the libp2p Node.
- `modules.transport`: An array that must include at least 1 transport, such as `libp2p-tcp`.

## Libp2p Instance Methods 

### start

Starts the libp2p node.

`libp2p.start()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when the node is ready |

#### Example

```js
const Libp2p = require('libp2p')

// ...

const libp2p = await Libp2p.create(options)

// start libp2p
await libp2p.start()
```

### stop

Stops the libp2p node.

`libp2p.stop()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when the node is fully stopped |

#### Example

```js
const Libp2p = require('libp2p')

// ...
const libp2p = await Libp2p.create(options)
// ...

// stop libp2p
await libp2p.stop()
```

### dial

Dials to another peer in the network and establishes the connection.

`dial(peer, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [PeerInfo](https://github.com/libp2p/js-peer-info), [PeerId](https://github.com/libp2p/js-peer-id), [multiaddr](https://github.com/multiformats/js-multiaddr), `string` | peer to dial |
| [options] | `Object` | dial options |
| [options.signal] | `AbortSignal` | abort signal |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Connection>` | Promise resolves with the [Connection](https://github.com/libp2p/js-interfaces/tree/master/src/connection) instance |

#### Example

```js
// ...
const conn = await libp2p.dial(remotePeerInfo)
```

### dialProtocol

Dials to another peer in the network and selects a protocol to communicate with that peer.

`dialProtocol(peer, protocols, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [PeerInfo](https://github.com/libp2p/js-peer-info), [PeerId](https://github.com/libp2p/js-peer-id), [multiaddr](https://github.com/multiformats/js-multiaddr), `string` | peer to dial |
| protocols | `String|Array<String>` | Strings that identifies the protocols (e.g '/ipfs/bitswap/1.1.0') |
| [options] | `Object` | dial options |
| [options.signal] | `AbortSignal` | abort signal |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Connection>` | Promise resolves with the [Connection](https://github.com/libp2p/js-interfaces/tree/master/src/connection) instance |

#### Example

```js
// ...
const conn = await libp2p.dialProtocol(remotePeerInfo, protocols)
```

### hangUp

Closes an open connection with a peer, graciously.

`hangUp(peer)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [PeerInfo](https://github.com/libp2p/js-peer-info), [PeerId](https://github.com/libp2p/js-peer-id), [multiaddr](https://github.com/multiformats/js-multiaddr), `string` | peer to hang up |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once connection closes |

#### Example

```js
// ...
await libp2p.hangUp(remotePeerInfo)
```

### handle

Registers a given handler for the given protocols.

`libp2p.handle(protocols, handler)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| protocols | `Array<String>|String` | protocols to register |
| handler | `function({ connection:*, stream:*, protocol:string })` | handler to call |


#### Example

```js
// ...
const handler = ({ connection, stream, protocol }) => {
  // use stream or connection according to the needs
}

libp2p.handle('/echo/1.0.0', handler)
```

### unhandle

Unregisters all handlers with the given protocols

`libp2p.unhandle(protocols)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| protocols | `Array<String>|String` | protocols to unregister |

#### Example

```js
// ...
libp2p.unhandle('/echo/1.0.0')
```

### peerRouting.findPeer

Iterates over all peer routers in series to find the given peer.

`libp2p.peerRouting.findPeer(peerId, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`](https://github.com/libp2p/js-peer-id) | ID of the peer to find |
| options | `Object` | operation options |
| options.timeout | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<PeerInfo>` | Peer info of a known peer |

#### Example

```js
// ...
const peerInfo = await libp2p.peerRouting.findPeer(peerId, options)
```

### contentRouting.findProviders

Iterates over all content routers in series to find providers of the given key.
Once a content router succeeds, the iteration will stop.

`libp2p.contentRouting.findProviders(cid, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`](https://github.com/multiformats/js-cid) | cid to find |
| options | `Object` | operation options |
| options.timeout | `number` | maximum time the query should run |
| options.maxNumProviders | `number` | maximum number of providers to find |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Array<PeerInfo>>` |  array of [`PeerInfo`](https://github.com/libp2p/js-peer-info) |

#### Example

```js
// ...
const providers = await libp2p.contentRouting.findProviders(cid)
```

### contentRouting.provide

Iterates over all content routers in parallel, in order to notify it is a provider of the given key.

`libp2p.contentRouting.provide(cid)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`](https://github.com/multiformats/js-cid) | cid to provide |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once notifications are sent |

#### Example

```js
// ...
await libp2p.contentRouting.provide(cid)
```

### _dht.put

Writes a value to a key in the DHT.

`libp2p._dht.put(key, value, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `String` | key to add to the dht |
| value | `Buffer` | value to add to the dht |
| [options] | `Object` | put options |
| [options.minPeers] | `number` | minimum number of peers required to successfully put (default: closestPeers.length) |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once value is stored |

#### Example

```js
// ...
const key = '/key'
const value = Buffer.from('oh hello there')

await libp2p._dht.put(key, value)
```

### _dht.get

Queries the DHT for a value stored for a given key.

`libp2p._dht.get(key, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `String` | key to get from the dht |
| [options] | `Object` | get options |
| [options.timeout] | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Buffer>` | Value obtained from the DHT |

#### Example

```js
// ...

const key = '/key'
const value = await libp2p._dht.get(key)
```

### _dht.getMany

Queries the DHT for the n values stored for the given key (without sorting).

`libp2p._dht.getMany(key, nvals, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `String` | key to get from the dht |
| nvals | `number` | number of values aimed |
| [options] | `Object` | get options |
| [options.timeout] | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Array<{from: PeerId, val: Buffer}>>` | Array of records obtained from the DHT |

#### Example

```js
// ...

const key = '/key'
const { from, val } = await libp2p._dht.get(key)
```

### pubsub.getPeersSubscribed

Gets a list of the peer-ids that are subscribed to one topic.

`libp2p.pubsub.getPeersSubscribed(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to publish |

#### Returns

| Type | Description |
|------|-------------|
| `Array<String>` | peer-id subscribed to the topic |

#### Example

```js
const peerIds = libp2p.pubsub.getPeersSubscribed(topic)
```

### pubsub.getTopics

Gets a list of topics the node is subscribed to.

`libp2p.pubsub.getTopics()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<String>` | topics the node is subscribed to |

#### Example

```js
const topics = libp2p.pubsub.getTopics()
```

### pubsub.publish

Publishes messages to the given topics.

`libp2p.pubsub.publish(topic, data)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to publish |
| data | `Buffer` | data to publish  |

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | publish success |

#### Example

```js
const topic = 'topic'
const data = Buffer.from('data')

await libp2p.pubsub.publish(topic, data)
```

### pubsub.subscribe

Subscribes the given handler to a pubsub topic.

`libp2p.pubsub.subscribe(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to subscribe |
| handler | `function(<Object>)` | handler for new data on topic |

#### Returns

| Type | Description |
|------|-------------|
| `void` |  |

#### Example

```js
const topic = 'topic'
const handler = (msg) => {
  // msg.data - pubsub data received
}

libp2p.pubsub.subscribe(topic, handler)
```

### pubsub.unsubscribe

Unsubscribes the given handler from a pubsub topic. If no handler is provided, all handlers for the topic are removed.

`libp2p.pubsub.unsubscribe(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to unsubscribe |
| handler | `function(<Object>)` | handler subscribed |

#### Returns

| Type | Description |
|------|-------------|
| `void` |  |

#### Example

```js
const topic = 'topic'
const handler = (msg) => {
  // msg.data - pubsub data received
}

libp2p.pubsub.unsubscribe(topic, handler)
```
