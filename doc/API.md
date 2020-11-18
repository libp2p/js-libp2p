# API

* [Static Functions](#static-functions)
  * [`create`](#create)
* [Instance Methods](#libp2p-instance-methods)
  * [`start`](#start)
  * [`stop`](#stop)
  * [`dial`](#dial)
  * [`dialProtocol`](#dialprotocol)
  * [`hangUp`](#hangup)
  * [`handle`](#handle)
  * [`unhandle`](#unhandle)
  * [`ping`](#ping)
  * [`multiaddrs`](#multiaddrs)
  * [`addressManager.getListenAddrs`](#addressmanagergetlistenaddrs)
  * [`addressmger.getAnnounceAddrs`](#addressmanagergetannounceaddrs)
  * [`addressManager.getNoAnnounceAddrs`](#addressmanagergetnoannounceaddrs)
  * [`contentRouting.findProviders`](#contentroutingfindproviders)
  * [`contentRouting.provide`](#contentroutingprovide)
  * [`contentRouting.put`](#contentroutingput)
  * [`contentRouting.get`](#contentroutingget)
  * [`contentRouting.getMany`](#contentroutinggetmany)
  * [`peerRouting.findPeer`](#peerroutingfindpeer)
  * [`peerStore.addressBook.add`](#peerstoreaddressbookadd)
  * [`peerStore.addressBook.delete`](#peerstoreaddressbookdelete)
  * [`peerStore.addressBook.get`](#peerstoreaddressbookget)
  * [`peerStore.addressBook.getMultiaddrsForPeer`](#peerstoreaddressbookgetmultiaddrsforpeer)
  * [`peerStore.addressBook.set`](#peerstoreaddressbookset)
  * [`peerStore.keyBook.delete`](#peerstorekeybookdelete)
  * [`peerStore.keyBook.get`](#peerstorekeybookget)
  * [`peerStore.keyBook.set`](#peerstorekeybookset)
  * [`peerStore.metadataBook.delete`](#peerstoremetadatabookdelete)
  * [`peerStore.metadataBook.deleteValue`](#peerstoremetadatabookdeletevalue)
  * [`peerStore.metadataBook.get`](#peerstoremetadatabookget)
  * [`peerStore.metadataBook.getValue`](#peerstoremetadatabookgetvalue)
  * [`peerStore.metadataBook.set`](#peerstoremetadatabookset)
  * [`peerStore.protoBook.add`](#peerstoreprotobookadd)
  * [`peerStore.protoBook.delete`](#peerstoreprotobookdelete)
  * [`peerStore.protoBook.get`](#peerstoreprotobookget)
  * [`peerStore.protoBook.set`](#peerstoreprotobookset)
  * [`peerStore.delete`](#peerstoredelete)
  * [`peerStore.get`](#peerstoreget)
  * [`peerStore.peers`](#peerstorepeers)
  * [`pubsub.getSubscribers`](#pubsubgetsubscribers)
  * [`pubsub.getTopics`](#pubsubgettopics)
  * [`pubsub.publish`](#pubsubpublish)
  * [`pubsub.subscribe`](#pubsubsubscribe)
  * [`pubsub.unsubscribe`](#pubsubunsubscribe)
  * [`pubsub.on`](#pubsubon)
  * [`pubsub.removeListener`](#pubsubremovelistener)
  * [`pubsub.topicValidators.set`](#pubsubtopicvalidatorsset)
  * [`pubsub.topicValidators.delete`](#pubsubtopicvalidatorsdelete)
  * [`connectionManager.get`](#connectionmanagerget)
  * [`connectionManager.setPeerValue`](#connectionmanagersetpeervalue)
  * [`connectionManager.size`](#connectionmanagersize)
  * [`keychain.createKey`](#keychaincreatekey)
  * [`keychain.renameKey`](#keychainrenamekey)
  * [`keychain.removeKey`](#keychainremovekey)
  * [`keychain.exportKey`](#keychainexportkey)
  * [`keychain.importKey`](#keychainimportkey)
  * [`keychain.importPeer`](#keychainimportpeer)
  * [`keychain.listKeys`](#keychainlistkeys)
  * [`keychain.findKeyById`](#keychainfindkeybyid)
  * [`keychain.findKeyByName`](#keychainfindkeybyname)
  * [`keychain.cms.encrypt`](#keychaincmsencrypt)
  * [`keychain.cms.decrypt`](#keychaincmsdecrypt)
  * [`metrics.global`](#metricsglobal)
  * [`metrics.peers`](#metricspeers)
  * [`metrics.protocols`](#metricsprotocols)
  * [`metrics.forPeer`](#metricsforpeer)
  * [`metrics.forProtocol`](#metricsforprotocol)
* [Events](#events)
  * [`libp2p`](#libp2p)
  * [`libp2p.connectionManager`](#libp2pconnectionmanager)
  * [`libp2p.peerStore`](#libp2ppeerStore)
* [Types](#types)
  * [`Stats`](#stats)

## Static Functions

### create

Creates an instance of Libp2p.

`create(options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| options | `object` | libp2p options |
| options.modules | [`Array<object>`](./CONFIGURATION.md#modules) | libp2p [modules](./CONFIGURATION.md#modules) to use |
| [options.addresses] | `{ listen: Array<string>, announce: Array<string>, noAnnounce: Array<string> }` | Addresses for transport listening and to advertise to the network |
| [options.config] | `object` | libp2p modules configuration and core configuration |
| [options.connectionManager] | [`object`](./CONFIGURATION.md#configuring-connection-manager) | libp2p Connection Manager [configuration](./CONFIGURATION.md#configuring-connection-manager) |
| [options.transportManager] | [`object`](./CONFIGURATION.md#configuring-transport-manager) | libp2p transport manager [configuration](./CONFIGURATION.md#configuring-transport-manager) |
| [options.datastore] | `object` | must implement [ipfs/interface-datastore](https://github.com/ipfs/interface-datastore) (in memory datastore will be used if not provided) |
| [options.dialer] | [`object`](./CONFIGURATION.md#configuring-dialing) | libp2p Dialer [configuration](./CONFIGURATION.md#configuring-dialing)
| [options.keychain] | [`object`](./CONFIGURATION.md#setup-with-keychain) | keychain [configuration](./CONFIGURATION.md#setup-with-keychain) |
| [options.metrics] | [`object`](./CONFIGURATION.md#configuring-metrics) | libp2p Metrics [configuration](./CONFIGURATION.md#configuring-metrics) |
| [options.peerId] | [`PeerId`][peer-id] | peerId instance (it will be created if not provided) |
| [options.peerStore] | [`object`](./CONFIGURATION.md#configuring-peerstore) | libp2p PeerStore [configuration](./CONFIGURATION.md#configuring-peerstore) |

For Libp2p configurations and modules details read the [Configuration Document](./CONFIGURATION.md).

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

Note: The [`PeerId`][peer-id] option is not required and will be generated if it is not provided.

<details><summary>Alternative</summary>
As an alternative, it is possible to create a Libp2p instance with the constructor:

#### Example

```js
const Libp2p = require('libp2p')

// specify options
const options = {}

// create libp2p
const libp2p = new Libp2p(options)
```

Required keys in the `options` object:

- `peerId`: instance of [`PeerId`][peer-id] that contains the peer Keys (optional when using `.create`).
- `modules.transport`: An array that must include at least 1 compliant transport. See [modules that implement the transport interface](https://github.com/libp2p/js-interfaces/tree/master/src/transport#modules-that-implement-the-interface).

</details>

## Libp2p Instance Methods

### loadKeychain

Load keychain keys from the datastore, importing the private key as 'self', if needed.

`libp2p.loadKeychain()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when the keychain is ready |

#### Example

```js
const Libp2p = require('libp2p')

// ...

const libp2p = await Libp2p.create({
  // ...
  keychain: {
    pass: '0123456789pass1234567890'
  }
})

// load keychain
await libp2p.loadKeychain()
```

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

### addresses

TODO with `address-manager`.

### connections

A Getter that returns a Map of the current Connections libp2p has to other peers.

`libp2p.connections`

#### Returns

| Type | Description |
|------|-------------|
| `Map<string, Array<Connection>>` | A map of [`PeerId`][peer-id] strings to [`Connection`][connection] Arrays |

#### Example

```js
for (const [peerId, connections] of libp2p.connections) {
  for (const connection of connections) {
    console.log(peerId, connection.remoteAddr.toString())
    // Logs the PeerId string and the observed remote multiaddr of each Connection
  }
}
```

### dial

`dial(peer, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [`PeerId`][peer-id]\|[`Multiaddr`][multiaddr]\|`string` | The peer to dial. |
| [options] | `object` | dial options |
| [options.signal] | [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | An `AbortSignal` instance obtained from an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) that can be used to abort the connection before it completes |

**Note:** If a [`Multiaddr`][multiaddr] or its string is provided, it **must** include the peer id. Moreover, if a [`PeerId`][peer-id] is given, the peer will need to have known multiaddrs for it in the PeerStore.

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Connection>` | Promise resolves with the [Connection][connection] instance |

#### Example

```js
// ...
const conn = await libp2p.dial(remotePeerId)

// create a new stream within the connection
const { stream, protocol } = await conn.newStream(['/echo/1.1.0', '/echo/1.0.0'])

// protocol negotiated: 'echo/1.0.0' means that the other party only supports the older version

// ...
await conn.close()
```

### dialProtocol

Dials to another peer in the network and selects a protocol to communicate with that peer. The stream between both parties is returned, together with the negotiated protocol.

`dialProtocol(peer, protocols, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [`PeerId`][peer-id]\|[`Multiaddr`][multiaddr]\|`string` | The peer to dial. |
| protocols | `string|Array<string>` |  A list of protocols (or single protocol) to negotiate with. Protocols are attempted in order until a match is made. (e.g '/ipfs/bitswap/1.1.0') |
| [options] | `object` | dial options |
| [options.signal] | [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | An `AbortSignal` instance obtained from an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) that can be used to abort the connection before it completes |

**Note:** If a [`Multiaddr`][multiaddr] or its string is provided, it **must** include the peer id. Moreover, if a [`PeerId`][peer-id] is given, the peer will need to have known multiaddrs for it in the PeerStore.

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ stream:*, protocol:string }>` | Promise resolves with a [duplex stream](https://github.com/libp2p/js-libp2p/blob/master/doc/STREAMING_ITERABLES.md#duplex) and the protocol used |

#### Example

```js
// ...
const pipe = require('it-pipe')

const { stream, protocol } = await libp2p.dialProtocol(remotePeerId, protocols)

// Use this new stream like any other duplex stream
pipe([1, 2, 3], stream, consume)
```

### hangUp

Attempts to gracefully close an open connection to the given peer. If the connection is not closed in the grace period, it will be forcefully closed.

`hangUp(peer)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [`PeerId`][peer-id]\|[`Multiaddr`][multiaddr]\|`string` | peer to hang up |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once connection closes |

#### Example

```js
// ...
await libp2p.hangUp(remotePeerId)
```

### handle

Sets up [multistream-select routing](https://github.com/multiformats/multistream-select) of protocols to their application handlers. Whenever a stream is opened on one of the provided protocols, the handler will be called. `handle` must be called in order to register a handler and support for a given protocol. This also informs other peers of the protocols you support.

`libp2p.handle(protocols, handler)`

In the event of a new handler for the same protocol being added, the first one is discarded.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| protocols | `Array<string>|string` | protocols to register |
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
| protocols | `Array<string>|string` | protocols to unregister |

#### Example

```js
// ...
libp2p.unhandle(['/echo/1.0.0'])
```

### ping

Pings a given peer and get the operation's latency.

`libp2p.ping(peer)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peer | [`PeerId`][peer-id]\|[`Multiaddr`][multiaddr]\|`string` | peer to ping |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<number>` | Latency of the operation in ms |

#### Example

```js
// ...
const latency = await libp2p.ping(otherPeerId)
```

## multiaddrs

Gets the multiaddrs the libp2p node announces to the network. This computes the advertising multiaddrs
of the peer by joining the multiaddrs that libp2p transports are listening on with the announce multiaddrs
provided in the libp2p config. Configured no announce multiaddrs will be filtered out of the advertised addresses.

`libp2p.multiaddrs`

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>` | Advertising multiaddrs |

#### Example

```js
// ...
const listenMa = libp2p.multiaddrs
// [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
```

### addressManager.getListenAddrs

Get the multiaddrs that were provided for listening on libp2p transports.

`libp2p.addressManager.getListenAddrs()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>` | Provided listening multiaddrs |

#### Example

```js
// ...
const listenMa = libp2p.addressManager.getListenAddrs()
// [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
```

### addressManager.getAnnounceAddrs

Get the multiaddrs that were provided to announce to the network.

`libp2p.addressManager.getAnnounceAddrs()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>` | Provided announce multiaddrs |

#### Example

```js
// ...
const announceMa = libp2p.addressManager.getAnnounceAddrs()
// [ <Multiaddr 047f00000106f9ba - /dns4/peer.io/...> ]
```

### addressManager.getNoAnnounceAddrs

Get the multiaddrs that were provided to not announce to the network.

`libp2p.addressManager.getNoAnnounceAddrs()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>` | Provided noAnnounce multiaddrs |

#### Example

```js
// ...
const noAnnounceMa = libp2p.addressManager.getNoAnnounceAddrs()
// [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
```

### transportManager.getAddrs

Get the multiaddrs that libp2p transports are using to listen on.

`libp2p.transportManager.getAddrs()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>` | listening multiaddrs |

#### Example

```js
// ...
const listenMa = libp2p.transportManager.getAddrs()
// [ <Multiaddr 047f00000106f9ba - /ip4/127.0.0.1/tcp/63930> ]
```

### contentRouting.findProviders

Iterates over all content routers in series to find providers of the given key.
Once a content router succeeds, the iteration will stop. If the DHT is enabled, it will be queried first.

`libp2p.contentRouting.findProviders(cid, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`][cid] | cid to find |
| options | `object` | operation options |
| options.timeout | `number` | maximum time the query should run |
| options.maxNumProviders | `number` | maximum number of providers to find |

#### Returns

| Type | Description |
|------|-------------|
| `AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }` |  Async iterator for peer data |

#### Example

```js
// Iterate over the providers found for the given cid
for await (const provider of libp2p.contentRouting.findProviders(cid)) {
  console.log(provider.id, provider.multiaddrs)
}
```

### contentRouting.provide

Iterates over all content routers in parallel, in order to notify it is a provider of the given key.

`libp2p.contentRouting.provide(cid)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`][cid] | cid to provide |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once notifications are sent |

#### Example

```js
// ...
await libp2p.contentRouting.provide(cid)
```

### contentRouting.put

Writes a value to a key in the DHT.

`libp2p.contentRouting.put(key, value, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `string` | key to add to the dht |
| value | `Uint8Array` | value to add to the dht |
| [options] | `object` | put options |
| [options.minPeers] | `number` | minimum number of peers required to successfully put (default: closestPeers.length) |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<void>` | Promise resolves once value is stored |

#### Example

```js
// ...
const key = '/key'
const value = uint8ArrayFromString('oh hello there')

await libp2p.contentRouting.put(key, value)
```

### contentRouting.get

Queries the DHT for a value stored for a given key.

`libp2p.contentRouting.get(key, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `string` | key to get from the dht |
| [options] | `object` | get options |
| [options.timeout] | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Uint8Array>` | Value obtained from the DHT |

#### Example

```js
// ...

const key = '/key'
const value = await libp2p.contentRouting.get(key)
```

### contentRouting.getMany

Queries the DHT for the n values stored for the given key (without sorting).

`libp2p.contentRouting.getMany(key, nvals, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `string` | key to get from the dht |
| nvals | `number` | number of values aimed |
| [options] | `object` | get options |
| [options.timeout] | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Array<{from: PeerId, val: Uint8Array}>>` | Array of records obtained from the DHT |

#### Example

```js
// ...

const key = '/key'
const records = await libp2p.contentRouting.getMany(key, 2)
```

### peerRouting.findPeer

Iterates over all peer routers in series to find the given peer. If the DHT is enabled, it will be tried first.

`libp2p.peerRouting.findPeer(peerId, options)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | ID of the peer to find |
| options | `object` | operation options |
| options.timeout | `number` | maximum time the query should run |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>` | Peer data of a known peer |

#### Example

```js
// ...
const peer = await libp2p.peerRouting.findPeer(peerId, options)
```

### peerStore.addressBook.add

Adds known `multiaddrs` of a given peer. If the peer is not known, it will be set with the provided multiaddrs.

`peerStore.addressBook.add(peerId, multiaddrs)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| multiaddrs | |`Array<Multiaddr>` | [`Multiaddrs`][multiaddr] to add |

#### Returns

| Type | Description |
|------|-------------|
| `AddressBook` | Returns the Address Book component |

#### Example

```js
peerStore.addressBook.add(peerId, multiaddr)
```

### peerStore.addressBook.delete

Delete the provided peer from the book.

`peerStore.addressBook.delete(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.addressBook.delete(peerId)
// false
peerStore.addressBook.set(peerId, multiaddr)
peerStore.addressBook.delete(peerId)
// true
```

### peerStore.addressBook.get

Get the known [`Addresses`][address] of a provided peer.

`peerStore.addressBook.get(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| `Array<Address>|undefined` | Array of peer's [`Addresses`][address] containing the multiaddr and its metadata if available, otherwise undefined |

#### Example

```js
peerStore.addressBook.get(peerId)
// undefined
peerStore.addressBook.set(peerId, multiaddr)
peerStore.addressBook.get(peerId)
// [
// {
//   multiaddr: /ip4/140.10.2.1/tcp/8000,
//   ...
// },
// {
//   multiaddr: /ip4/140.10.2.1/ws/8001
//   ...
// },
// ]
```

## peerStore.addressBook.getMultiaddrsForPeer

Get the known `Multiaddr` of a provided peer. All returned multiaddrs will include the encapsulated `PeerId` of the peer.

`peerStore.addressBook.getMultiaddrsForPeer(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| `Array<Multiaddr>|undefined` | Array of peer's multiaddr if available, otherwise undefined |

#### Example

```js
peerStore.addressBook.getMultiaddrsForPeer(peerId)
// undefined
peerStore.addressBook.set(peerId, multiaddr)
peerStore.addressBook.getMultiaddrsForPeer(peerId)
// [
// /ip4/140.10.2.1/tcp/8000/p2p/QmW8rAgaaA6sRydK1k6vonShQME47aDxaFidbtMevWs73t
// /ip4/140.10.2.1/ws/8001/p2p/QmW8rAgaaA6sRydK1k6vonShQME47aDxaFidbtMevWs73t
// ]
```

### peerStore.addressBook.set

Set known `multiaddrs` of a given peer. This will replace previously stored multiaddrs, if available.
Replacing stored multiaddrs might result in losing obtained certified addresses, which is not desirable.
Consider using `addressBook.add()` if you're not sure this is what you want to do.

`peerStore.addressBook.set(peerId, multiaddrs)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| multiaddrs | |`Array<Multiaddr>` | [`Multiaddrs`][multiaddr] to store |

#### Returns

| Type | Description |
|------|-------------|
| `AddressBook` | Returns the Address Book component |

#### Example

```js
peerStore.addressBook.add(peerId, multiaddr)
```

### peerStore.protoBook.add

Add known `protocols` of a given peer.

`peerStore.protoBook.add(peerId, protocols)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| protocols | `Array<string>` | protocols to add |

#### Returns

| Type | Description |
|------|-------------|
| `ProtoBook` | Returns the Proto Book component |

#### Example

```js
peerStore.protoBook.add(peerId, protocols)
```


### peerStore.keyBook.delete

Delete the provided peer from the book.

`peerStore.keyBook.delete(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.keyBook.delete(peerId)
// false
peerStore.keyBook.set(peerId, publicKey)
peerStore.keyBook.delete(peerId)
// true
```

### peerStore.keyBook.get

Get the known `PublicKey` of a provided peer.

`peerStore.keyBook.get(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| [`RsaPublicKey\|Ed25519PublicKey\|Secp256k1PublicKey`][keys] | Peer PublicKey |

#### Example

```js
peerStore.keyBook.get(peerId)
// undefined
peerStore.keyBook.set(peerId, publicKey)
peerStore.keyBook.get(peerId)
// PublicKey
```

### peerStore.keyBook.set

Set known `peerId`. This can include its Public Key.

`peerStore.keyBook.set(peerId, publicKey)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| publicKey | [`RsaPublicKey\|Ed25519PublicKey\|Secp256k1PublicKey`][keys] | peer's public key |

#### Returns

| Type | Description |
|------|-------------|
| `KeyBook` | Returns the Key Book component |

#### Example

```js
const publicKey = peerId.pubKey
peerStore.keyBook.set(peerId, publicKey)
```

### peerStore.metadataBook.delete

Delete the provided peer from the book.

`peerStore.metadataBook.delete(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.metadataBook.delete(peerId)
// false
peerStore.metadataBook.set(peerId, 'nickname', uint8ArrayFromString('homePeer'))
peerStore.metadataBook.delete(peerId)
// true
```

### peerStore.metadataBook.deleteValue

Deletes the provided peer metadata key-value pair from the book.

`peerStore.metadataBook.deleteValue(peerId, key)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |
| key | `string` | key of the metadata value to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.metadataBook.deleteValue(peerId, 'location')
// false
peerStore.metadataBook.set(peerId, 'location', uint8ArrayFromString('Berlin'))
peerStore.metadataBook.deleteValue(peerId, 'location')
// true
```

### peerStore.metadataBook.get

Get the known metadata of a provided peer.

`peerStore.metadataBook.get(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| `Map<string, Uint8Array>` | Peer Metadata |

#### Example

```js
peerStore.metadataBook.get(peerId)
// undefined
peerStore.metadataBook.set(peerId, 'location', uint8ArrayFromString('Berlin'))
peerStore.metadataBook.get(peerId)
// Metadata Map
```

### peerStore.metadataBook.getValue

Get specific metadata of a provided peer.

`peerStore.metadataBook.getValue(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |
| key | `string` | key of the metadata value to get |

#### Returns

| Type | Description |
|------|-------------|
| `Map<string, Uint8Array>` | Peer Metadata |

#### Example

```js
peerStore.metadataBook.getValue(peerId, 'location')
// undefined
peerStore.metadataBook.set(peerId, 'location', uint8ArrayFromString('Berlin'))
peerStore.metadataBook.getValue(peerId, 'location')
// Metadata Map
```

### peerStore.metadataBook.set

Set known metadata of a given `peerId`.

`peerStore.metadataBook.set(peerId, key, value)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| key | `string` | key of the metadata value to store |
| value | `Uint8Array` | metadata value to store |

#### Returns

| Type | Description |
|------|-------------|
| `MetadataBook` | Returns the Metadata Book component |

#### Example

```js
peerStore.metadataBook.set(peerId, 'location', uint8ArrayFromString('Berlin'))
```

### peerStore.protoBook.delete

Delete the provided peer from the book.

`peerStore.protoBook.delete(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.protoBook.delete(peerId)
// false
peerStore.protoBook.set(peerId, protocols)
peerStore.protoBook.delete(peerId)
// true
```

### peerStore.protoBook.get

Get the known `protocols` of a provided peer.

`peerStore.protoBook.get(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| `Array<string>` | Array of peer's supported protocols |

#### Example

```js
peerStore.protoBook.get(peerId)
// undefined
peerStore.protoBook.set(peerId, [ '/proto/1.0.0', '/proto/1.1.0' ])
peerStore.protoBook.get(peerId)
// [ '/proto/1.0.0', '/proto/1.1.0' ]
```

### peerStore.protoBook.set

Set known `protocols` of a given peer.

`peerStore.protoBook.set(peerId, protocols)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to set |
| protocols | `Array<string>` | protocols to store |

#### Returns

| Type | Description |
|------|-------------|
| `ProtoBook` | Returns the Proto Book component |

#### Example

```js
peerStore.protoBook.set(peerId, protocols)
```

### peerStore.delete

Delete the provided peer from every book.

`peerStore.delete(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to remove |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | true if found and removed |

#### Example

```js
peerStore.delete(peerId)
// false
peerStore.addressBook.set(peerId, multiaddrs)
peerStore.protoBook.set(peerId, protocols)
peerStore.delete(peerId)
// true
peerStore.delete(peerId2)
// false
peerStore.addressBook.set(peerId2, multiaddrs)
peerStore.delete(peerId2)
// true
```

### peerStore.get

Get the stored information of a given peer, namely its [`PeerId`][peer-id], known [`Addresses`][address] and supported protocols.

`peerStore.get(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | peerId to get |

#### Returns

| Type | Description |
|------|-------------|
| `{ id: PeerId, addresses: Array<Address>, metadata: Map<string, Buffer>}, protocols: Array<string> }` | Peer information of the provided peer |

#### Example

```js
peerStore.get(peerId)
// false
peerStore.addressBook.set(peerId, multiaddrs)
peerStore.protoBook.set(peerId, protocols)
peerStore.get(peerId)
// {
//   id: {},
//   addresses: [...],
//   protocols: [...]
// }
```

### peerStore.peers

Get all the stored information of every peer.

`peerStore.peers`

#### Returns

| Type | Description |
|------|-------------|
| `Map<string, { id: PeerId, addresses: Array<Address>, metadata: Map<string, Buffer>}, protocols: Array<string> }>` | Peer data of every peer known |

#### Example

```js
for (let [peerIdString, peer] of peerStore.peers.entries()) {
  // peer { id, addresses, metadata, protocols }
}
```

### pubsub.getSubscribers

Gets a list of the peer-ids that are subscribed to one topic.

`libp2p.pubsub.getSubscribers(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to publish |

#### Returns

| Type | Description |
|------|-------------|
| `Array<string>` | peer-id subscribed to the topic |

#### Example

```js
const peerIds = libp2p.pubsub.getSubscribers(topic)
```

### pubsub.getTopics

Gets a list of topics the node is subscribed to.

`libp2p.pubsub.getTopics()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<string>` | topics the node is subscribed to |

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
| data | `Uint8Array` | data to publish  |

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | publish success |

#### Example

```js
const topic = 'topic'
const data = uint8ArrayFromString('data')

await libp2p.pubsub.publish(topic, data)
```

### pubsub.subscribe

Subscribes to a pubsub topic.

`libp2p.pubsub.subscribe(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to subscribe |

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

libp2p.pubsub.on(topic, handler)
libp2p.pubsub.subscribe(topic)
```

### pubsub.unsubscribe

Unsubscribes from a pubsub topic.

`libp2p.pubsub.unsubscribe(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to unsubscribe |

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

libp2p.pubsub.removeListener(topic handler)
libp2p.pubsub.unsubscribe(topic)
```

## pubsub.on

A Pubsub router is an [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and uses its events for pubsub message handlers.

`libp2p.pubsub.on(topic, handler)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to listen |
| handler | `function({ from: string, data: Uint8Array, seqno: Uint8Array, topicIDs: Array<string>, signature: Uint8Array, key: Uint8Array })` | handler for new data on topic |

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

libp2p.pubsub.on(topic, handler)
libp2p.pubsub.subscribe(topic)
```

## pubsub.removeListener

A Pubsub router is an [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) and uses its events for pubsub message handlers.

`libp2p.pubsub.removeListener(topic, handler)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to remove listener |
| handler | `function({ from: string, data: Uint8Array, seqno: Uint8Array, topicIDs: Array<string>, signature: Uint8Array, key: Uint8Array })` | handler for new data on topic |

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

libp2p.pubsub.removeListener(topic handler)
libp2p.pubsub.unsubscribe(topic)
```

## pubsub.topicValidators.set

Pubsub routers support message validators per topic, which will validate the message before its propagations. Set is used to specify a validator for a topic.

`libp2p.pubsub.topicValidators.set(topic, validator)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to bind a validator |
| handler | `function({ topic: string, msg: RPC })` | validator for new data on topic |

#### Returns

| Type | Description |
|------|-------------|
| `Map<string, function(string, RPC)>` | The `Map` object |

#### Example

```js
const topic = 'topic'
const validateMessage = (msgTopic, msg) => {
  const input = uint8ArrayToString(msg.data)
  const validInputs = ['a', 'b', 'c']

  if (!validInputs.includes(input)) {
    throw new Error('no valid input received')
  }
}
libp2p.pubsub.topicValidators.set(topic, validateMessage)
```

## pubsub.topicValidators.delete

Pubsub routers support message validators per topic, which will validate the message before its propagations. Delete is used to remove a validator for a topic.

`libp2p.pubsub.topicValidators.delete(topic)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to remove a validator |

#### Returns

| Type | Description |
|------|-------------|
| `boolean` | `true` if an element in the Map object existed and has been removed, or `false` if the element does not exist. |

#### Example

```js
const topic = 'topic'
libp2p.pubsub.topicValidators.delete(topic)
```

### connectionManager.get

Get a connection with a given peer, if it exists.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | The peer to find |

#### Returns

| Type | Description |
|------|-------------|
| [`Connection`][connection] | Connection with the given peer |

#### Example

```js
libp2p.connectionManager.get(peerId)
```

### connectionManager.setPeerValue

Enables users to change the value of certain peers in a range of 0 to 1. Peers with the lowest values will have their Connections pruned first, if any Connection Manager limits are exceeded. See [./CONFIGURATION.md#configuring-connection-manager](./CONFIGURATION.md#configuring-connection-manager) for details on how to configure these limits.

`libp2p.connectionManager.setPeerValue(peerId, value)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | The peer to set the value for |
| value | `number` | The value of the peer from 0 to 1 |

#### Returns

| Type | Description |
|------|-------------|
| `void` |  |

#### Example

```js
libp2p.connectionManager.setPeerValue(highPriorityPeerId, 1)
libp2p.connectionManager.setPeerValue(lowPriorityPeerId, 0)
```

### connectionManager.size

Getter for obtaining the current number of open connections.

#### Example

```js
libp2p.connectionManager.size
// 10
```

### keychain.createKey

Create a key in the keychain.

`libp2p.keychain.createKey(name, type, size)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. It cannot already exist. |
| type | `string` | One of the key types; 'rsa' |
| [size] | `number` | The key size in bits. Must be provided for rsa keys. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
const keyInfo = await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
```

### keychain.renameKey

Rename a key in the keychain.

`libp2p.keychain.renameKey(oldName, newName)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The old local key name. It must already exist. |
| type | `string` | The new local key name. It must not already exist. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const keyInfo = await libp2p.keychain.renameKey('keyTest', 'keyNewNtest')
```

### keychain.removeKey

Removes a key from the keychain.

`libp2p.keychain.removeKey(name)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. It must already exist. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const keyInfo = await libp2p.keychain.removeKey('keyTest')
```

### keychain.exportKey

Export an existing key as a PEM encrypted PKCS #8 string.

`libp2p.keychain.exportKey(name, password)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. It must already exist. |
| password | `string` | The password to use. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<string>` | Key as a PEM encrypted PKCS #8 |

#### Example

```js
await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
```

### keychain.importKey

Import a new key from a PEM encoded PKCS #8 string.

`libp2p.keychain.importKey(name, pem, password)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. It must not exist. |
| pem | `string` | The PEM encoded PKCS #8 string. |
| password | `string` | The password to use. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const pemKey = await libp2p.keychain.exportKey('keyTest', 'password123')
const keyInfo = await libp2p.keychain.importKey('keyTestImport', pemKey, 'password123')
```

### keychain.importPeer

Import a new key from a PeerId.

`libp2p.keychain.importPeer(name, peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. It must not exist. |
| peerId | ['PeerId'][peer-id] | The PEM encoded PKCS #8 string. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
const keyInfo = await libp2p.keychain.importPeer('keyTestImport', peerId)
```

### keychain.listKeys

List all the keys.

`libp2p.keychain.listKeys()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Array<{ id, name }>>` | Array of Key info |

#### Example

```js
const keyInfos = await libp2p.keychain.listKeys()
```

### keychain.findKeyById

Find a key by it's id.

`libp2p.keychain.findKeyById(id)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| id | `string` | The universally unique key identifier. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
const keyInfo = await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const keyInfo2 = await libp2p.keychain.findKeyById(keyInfo.id)
```

### keychain.findKeyByName

Find a key by it's name.

`libp2p.keychain.findKeyByName(id)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| id | `string` | The local key name. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<{ id, name }>` | Key info object |

#### Example

```js
const keyInfo = await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const keyInfo2 = await libp2p.keychain.findKeyByName('keyTest')
```

### keychain.cms.encrypt

Encrypt protected data using the Cryptographic Message Syntax (CMS).

`libp2p.keychain.cms.encrypt(name, data)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| name | `string` | The local key name. |
| data | `Uint8Array` | The data to encrypt. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Uint8Array>` | Encrypted data as a PKCS #7 message in DER. |

#### Example

```js
const keyInfo = await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const enc = await libp2p.keychain.cms.encrypt('keyTest', uint8ArrayFromString('data'))
```

### keychain.cms.decrypt

Decrypt protected data using the Cryptographic Message Syntax (CMS).
The keychain must contain one of the keys used to encrypt the data.  If none of the keys exists, an Error is returned with the property 'missingKeys'.

`libp2p.keychain.cms.decrypt(cmsData)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cmsData | `string` | The CMS encrypted data to decrypt. |

#### Returns

| Type | Description |
|------|-------------|
| `Promise<Uint8Array>` | Decrypted data. |

#### Example

```js
const keyInfo = await libp2p.keychain.createKey('keyTest', 'rsa', 4096)
const enc = await libp2p.keychain.cms.encrypt('keyTest', uint8ArrayFromString('data'))
const decData = await libp2p.keychain.cms.decrypt(enc)
```

### metrics.global

A [`Stats`](#stats) object of tracking the global bandwidth of the libp2p node.

#### Example

```js
const peerIdStrings = libp2p.metrics.peers
```

### metrics.peers

An array of [`PeerId`][peer-id] strings of each peer currently being tracked.

#### Example

```js
const peerIdStrings = libp2p.metrics.peers
```

### metrics.protocols

An array of protocol strings that are currently being tracked.

#### Example

```js
const protocols = libp2p.metrics.protocols
```

### metrics.forPeer

Returns the [`Stats`](#stats) object for a given [`PeerId`][peer-id] if it is being tracked.

`libp2p.metrics.forPeer(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`][peer-id] | The peer to get stats for |

#### Returns

| Type | Description |
|------|-------------|
| [`Stats`](#stats) | The bandwidth stats of the peer |

#### Example

```js
const peerStats = libp2p.metrics.forPeer(peerId)
console.log(peerStats.toJSON())
```

### metrics.forProtocol

Returns the [`Stats`](#stats) object for a given protocol if it is being tracked.

`libp2p.metrics.forProtocol(protocol)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| protocol | `string` | The protocol to get stats for |

#### Returns

| Type | Description |
|------|-------------|
| [`Stats`](#stats) | The bandwidth stats of the protocol across all peers |

#### Example

```js
const peerStats = libp2p.metrics.forProtocol('/meshsub/1.0.0')
console.log(peerStats.toJSON())
```

## Events

Once you have a libp2p instance, you can listen to several events it emits, so that you can be notified of relevant network events.

### libp2p

#### An error has occurred

`libp2p.on('error', (err) => {})`

- `err`: instance of `Error`

#### A peer has been discovered

`libp2p.on('peer:discovery', (peer) => {})`

If `autoDial` option is `true`, applications should **not** attempt to connect to the peer
unless they are performing a specific action. See [peer discovery and auto dial](./PEER_DISCOVERY.md) for more information.

- `peer`: instance of [`PeerId`][peer-id]

### libp2p.connectionManager

#### A new connection to a peer has been opened

This event will be triggered anytime a new Connection is established to another peer.

`libp2p.connectionManager.on('peer:connect', (connection) => {})`

- `connection`: instance of [`Connection`][connection]

#### An existing connection to a peer has been closed

This event will be triggered anytime we are disconnected from another peer, regardless of the circumstances of that disconnection. If we happen to have multiple connections to a peer, this event will **only** be triggered when the last connection is closed.

`libp2p.connectionManager.on('peer:disconnect', (connection) => {})`

- `connection`: instance of [`Connection`][connection]

### libp2p.peerStore

#### A new peer is added to the peerStore

`libp2p.peerStore.on('peer', (peerId) => {})`

- `peerId`: instance of [`PeerId`][peer-id]

#### Known multiaddrs for a peer change

`libp2p.peerStore.on('change:multiaddrs', ({ peerId, multiaddrs}) => {})`

- `peerId`: instance of [`PeerId`][peer-id]
- `multiaddrs`: array of known [`multiaddr`][multiaddr] for the peer

#### Known protocols for a peer change

`libp2p.peerStore.on('change:protocols', ({ peerId, protocols}) => {})`

- `peerId`: instance of [`PeerId`][peer-id]
- `protocols`: array of known, supported protocols for the peer (string identifiers)

## Types

### Stats

- `Stats`
  - `toJSON<function()>`: Returns a JSON snapshot of the stats.
    - `dataReceived<string>`: The stringified value of total incoming data for this stat.
    - `dataSent<string>`: The stringified value of total outgoing data for this stat.
    - `movingAverages<object>`: The properties are dependent on the configuration of the moving averages interval. Defaults are listed here.
      - `['60000']<number>`: The calculated moving average at a 1 minute interval.
      - `['300000']<number>`: The calculated moving average at a 5 minute interval.
      - `['900000']<number>`: The calculated moving average at a 15 minute interval.
  - `snapshot<object>`: A getter that returns a clone of the raw stats.
    - `dataReceived<BigNumber>`: A [`BigNumber`](https://github.com/MikeMcl/bignumber.js/) of the amount of incoming data
    - `dataSent<BigNumber>`: A [`BigNumber`](https://github.com/MikeMcl/bignumber.js/) of the amount of outgoing data
  - `movingAverages<object>`: A getter that returns a clone of the raw [moving averages](https://www.npmjs.com/package/moving-averages) stats. **Note**: The properties of this are dependent on configuration. The defaults are shown here.
    - `['60000']<MovingAverage>`: The [MovingAverage](https://www.npmjs.com/package/moving-averages) at a 1 minute interval.
    - `['300000']<MovingAverage>`: The [MovingAverage](https://www.npmjs.com/package/moving-averages) at a 5 minute interval.
    - `['900000']<MovingAverage>`: The [MovingAverage](https://www.npmjs.com/package/moving-averages) at a 15 minute interval.

[address]: https://github.com/libp2p/js-libp2p/tree/master/src/peer-store/address-book.js
[cid]: https://github.com/multiformats/js-cid
[connection]: https://github.com/libp2p/js-interfaces/tree/master/src/connection
[multiaddr]: https://github.com/multiformats/js-multiaddr
[peer-id]: https://github.com/libp2p/js-peer-id
[keys]: https://github.com/libp2p/js-libp2p-crypto/tree/master/src/keys
