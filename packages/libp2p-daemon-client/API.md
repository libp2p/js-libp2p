# API

* [Getting started](#getting-started)
* [`close`](#close)
* [`connect`](#connect)
* [`identify`](#identify)
* [`listPeers`](#listPeers)
* [`openStream`](#openStream)
* [`registerStream`](#registerStream)
* [`dht.put`](#dht.put)
* [`dht.get`](#dht.get)
* [`dht.findPeer`](#dht.findPeer)
* [`dht.provide`](#dht.provide)
* [`dht.findProviders`](#dht.findProviders)
* [`dht.getClosestPeers`](#dht.getClosestPeers)
* [`dht.getPublicKey`](#dht.getPublicKey)
* [`pubsub.getTopics`](#pubsub.getTopics)
* [`pubsub.publish`](#pubsub.publish)
* [`pubsub.subscribe`](#pubsub.subscribe)

## Getting started

Create a new daemon client, using a unix socket.

### `Client(socketPath)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| socketPath | `String` | unix socket path |

#### Returns

Client instance

#### Example

```js
const Client = require('libp2p-daemon-client')

const defaultSock = '/tmp/p2pd.sock'
const client = new Client(defaultSock)

// client.{}
```

## close

Closes the socket.

### `client.close()`

#### Returns

| Type | Description |
|------|-------------|
| `Promise` | Promise resolves when socket is closed |

#### Example

```js
const Client = require('libp2p-daemon-client')

const defaultSock = '/tmp/p2pd.sock'
const client = new Client(defaultSock)

// close the socket
await client.close()
```

## connect

Requests a connection to a known peer on a given set of addresses.

### `client.connect(peerId, addrs)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`](https://github.com/libp2p/js-peer-id) | peer ID to connect |
| options | `Object` | set of addresses to connect |

#### Example

```js
const client = new Client(defaultSock)

try {
  await client.connect(peerId, addrs)
} catch (err) {
  //
}
```

## identify

Query the daemon for its peer ID and listen addresses.

### `client.identify()`

#### Returns

| Type | Description |
|------|-------------|
| `Object` | Identify response |
| `Object.peerId` | Peer id of the daemon |
| `Object.addrs` | Addresses of the daemon |

#### Example

```js
const client = new Client(defaultSock)

let identify

try {
  identify = await client.identify()
} catch (err) {
  //
}
```

## listPeers

Get a list of IDs of peers the node is connected to.

### `client.listPeers()`

#### Returns

| Type | Description |
|------|-------------|
| `Array` | array of peer id's |
| `Array.<PeerId>` | Peer id of a node |

#### Example

```js
const client = new Client(defaultSock)

let identify

try {
  identify = await client.identify()
} catch (err) {
  //
}
```

## openStream

Initiate an outbound stream to a peer on one of a set of protocols.

### `client.openStream(peerId, protocol)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`](https://github.com/libp2p/js-peer-id) | peer ID to connect |
| protocol | `string` | protocol to use |

#### Returns

| Type | Description |
|------|-------------|
| `Socket` | socket to write data |

#### Example

```js
const protocol = '/protocol/1.0.0'
const client = new Client(defaultSock)

let socket

try {
  socket = await client.openStream(peerId, protocol)
} catch (err) {
  //
}

socket.write(uint8ArrayFromString('data'))
```

## registerStreamHandler

Register a handler for inbound streams on a given protocol.

### `client.registerStreamHandler(path, protocol)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| path | `string` | socket path |
| protocol | `string` | protocol to use |

#### Example

```js
const protocol = '/protocol/1.0.0'
const client = new Client(defaultSock)

await client.registerStreamHandler(path, protocol)
```

## dht.put

Write a value to a key in the DHT.

### `client.dht.put(key, value)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `Uint8Array` | key to add to the dht |
| value | `Uint8Array` | value to add to the dht |

#### Example

```js
const client = new Client(defaultSock)

const key = '/key'
const value = uint8ArrayFromString('oh hello there')

try {
  await client.dht.put(key, value)
} catch (err) {
  //
}
```

## dht.get

Query the DHT for a value stored through a key in the DHT.

### `client.dht.get(key)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `Uint8Array` | key to get from the dht |

#### Returns

| Type | Description |
|------|-------------|
| `Uint8Array` | Value obtained from the DHT |

#### Example

```js
const client = new Client(defaultSock)

const key = '/key'
let value

try {
  value = await client.dht.get(key, value)
} catch (err) {
  //
}
```

## dht.findPeer

Query the DHT for a given peer's known addresses.

### `client.dht.findPeer(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`](https://github.com/libp2p/js-peer-id) | ID of the peer to find |

#### Returns

| Type | Description |
|------|-------------|
| `PeerInfo` | Peer info of a known peer |

#### Example

```js
const client = new Client(defaultSock)

let peerInfo

try {
  peerInfo = await client.dht.findPeer(peerId)
} catch (err) {
  //
}
```

## dht.provide

Announce that have data addressed by a given CID.

### `client.dht.provide(cid)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`](https://github.com/multiformats/js-cid) | cid to provide |

#### Example

```js
const client = new Client(defaultSock)

try {
  await client.dht.provide(cid)
} catch (err) {
  //
}
```

## dht.findProviders

Query the DHT for peers that have a piece of content, identified by a CID.

### `client.dht.findProviders(cid, [count])`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| cid | [`CID`](https://github.com/multiformats/js-cid) | cid to find |
| count | `number` | number or results aimed |

#### Returns

| Type | Description |
|------|-------------|
| `Array` | array of peer info |
| `Array.<PeerInfo>` | Peer info of a node |

#### Example

```js
const client = new Client(defaultSock)

let peerInfos

try {
  peerInfos = await client.dht.findProviders(cid)
} catch (err) {
  //
}
```

## dht.getClosestPeers

Query the DHT routing table for peers that are closest to a provided key.

### `client.dht.getClosestPeers(key)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| key | `Uint8Array` | key to get from the dht |

#### Returns

| Type | Description |
|------|-------------|
| `Array` | array of peer info |
| `Array.<PeerInfo>` | Peer info of a node |

#### Example

```js
const client = new Client(defaultSock)

let peerInfos

try {
  peerInfos = await client.dht.getClosestPeers(key)
} catch (err) {
  //
}
```

## dht.getPublicKey

Query the DHT routing table for a given peer's public key.

### `client.dht.getPublicKey(peerId)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| peerId | [`PeerId`](https://github.com/libp2p/js-peer-id) | ID of the peer to find |

#### Returns

| Type | Description |
|------|-------------|
| `PublicKey` | public key of the peer |

#### Example

```js
const client = new Client(defaultSock)

let publicKey

try {
  publicKey = await client.dht.getPublicKey(peerId)
} catch (err) {
  //
}
```

### `client.pubsub.getTopics()`

#### Returns

| Type | Description |
|------|-------------|
| `Array<String>` | topics the node is subscribed to |

#### Example

```js
const client = new Client(defaultSock)

let topics

try {
  topics = await client.pubsub.getTopics()
} catch (err) {
  //
}
```

### `client.pubsub.publish()`

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
const client = new Client(defaultSock)

try {
  await client.pubsub.publish(topic, data)
} catch (err) {
  //
}
```

### `client.pubsub.subscribe()`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| topic | `string` | topic to subscribe |

#### Returns

| Type | Description |
|------|-------------|
| `AsyncIterator` | data published |

#### Example

```js
const topic = 'topic'
const client = new Client(defaultSock)

for await (const msg of client.pubsub.subscribe(topic)) {
  // msg.data - pubsub data received
}
```
