# API

* [`create`](#create)
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
* [`dht.put`](#dht.put)
* [`dht.get`](#dht.get)
* [`dht.findPeer`](#dht.findPeer)
* [`dht.provide`](#dht.provide)
* [`dht.findProviders`](#dht.findProviders)
* [`dht.getClosestPeers`](#dht.getClosestPeers)
* [`dht.getPublicKey`](#dht.getPublicKey)
* [`pubsub.getPeersSubscribed`](#pubsub.getPeersSubscribed)
* [`pubsub.getTopics`](#pubsub.getTopics)
* [`pubsub.publish`](#pubsub.publish)
* [`pubsub.subscribe`](#pubsub.subscribe)

## create

Creates an instance of Libp2p.

### `create(options)`

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
const { create } = require('libp2p')

// specify options
const options = {}

// create libp2p
const libp2p = await create(options)
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

## start

Starts the libp2p node.

### `libp2p.start()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when the node is ready |

#### Example

```js
const { create } = require('libp2p')

// ...

const libp2p = await create(options)

// start libp2p
await libp2p.start()
```

## stop

Stops the libp2p node.

### `libp2p.stop()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when the node is fully stopped |

#### Example

```js
const { create } = require('libp2p')

// ...
const libp2p = await create(options)
// ...

// stop libp2p
await libp2p.stop()
```

## dial

Dials to another peer in the network, establishes the connection.

### `dial(peer, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [PeerInfo](https://github.com/libp2p/js-peer-info), [PeerId](https://github.com/libp2p/js-peer-id), [multiaddr](https://github.com/multiformats/js-multiaddr), `string` | peer to dial |
| [options] | `Object` | dial options |
| [options.abort] | `AbortSignal` | abort signal |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Connection>` | Promise resolves with the [Connection](https://github.com/libp2p/js-interfaces/tree/master/src/connection) instance |

#### Example

```js
// ...
const conn = await libp2p.dial(remotePeerInfo)
```

## dialProtocol

Dials to another peer in the network and selects a protocol to communicate with that peer.

### `dialProtocol(peer, protocols, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [PeerInfo](https://github.com/libp2p/js-peer-info), [PeerId](https://github.com/libp2p/js-peer-id), [multiaddr](https://github.com/multiformats/js-multiaddr), `string` | peer to dial |
| protocols | `String|Array<String>` | Strings that identifies the protocols (e.g '/ipfs/bitswap/1.1.0') |
| [options] | `Object` | dial options |
| [options.abort] | `AbortSignal` | abort signal |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Connection>` | Promise resolves with the [Connection](https://github.com/libp2p/js-interfaces/tree/master/src/connection) instance |

#### Example

```js
// ...
const conn = await libp2p.dialProtocol(remotePeerInfo, protocols)
```

## hangUp

Closes an open connection with a peer, graciously.

### `hangUp(peer)`

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

## handle

TODO

## unhandle

TODO

## peerRouting.findPeer

TODO

## contentRouting.findProviders

TODO

## contentRouting.provide

TODO

## dht.put

TODO

## dht.get

TODO

## dht.findPeer

TODO

## dht.provide

TODO

## dht.findProviders

TODO

## dht.getClosestPeers

TODO

## dht.getPublicKey

TODO

## pubsub.getPeersSubscribed

TODO

## pubsub.getTopics

TODO

## pubsub.publish

TODO

## pubsub.subscribe

TODO
