# API

* [arrayEquals(a, b)](#arrayequalsa-b)
    * [Parameters](#parameters)
    * [Returns](#returns)
    * [Example](#example)
* [multiaddr .isLoopback(ma)](#multiaddr-isloopbackma)
    * [Parameters](#parameters-1)
    * [Returns](#returns-1)
    * [Example](#example-1)
* [multiaddr .isPrivate(ma)](#multiaddr-isprivatema)
    * [Parameters](#parameters-2)
    * [Returns](#returns-2)
    * [Example](#example-2)
* [ipPortToMultiaddr(ip, port)](#ipporttomultiaddrip-port)
    * [Parameters](#parameters-3)
    * [Returns](#returns-3)
    * [Example](#example-3)
* [streamToMaConnection(streamProperties, options)](#streamtomaconnectionstreamproperties-options)
    * [Parameters](#parameters-4)
    * [Returns](#returns-4)
    * [Example](#example-4)

## arrayEquals(a, b)

Verify if two arrays of non primitive types with the "equals" function are equal.
Compatible with multiaddr, peer-id and others.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| a | `Array<*>` | First array to verify |
| b | `Array<*>` | Second array to verify |

### Returns

| Type | Description |
|------|-------------|
| `boolean` | returns true if arrays are equal, false otherwise |

### Example

```js
const PeerId = require('peer-id')
const arrayEquals = require('libp2p-utils/src/array-equals')

const peerId1 = await PeerId.create()
const peerId2 = await PeerId.create()

const equals = arrayEquals([peerId1], [peerId2])
```

## multiaddr `.isLoopback(ma)`

Check if a given multiaddr is a loopback address.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| ma | `Multiaddr` | multiaddr to verify |

### Returns

| Type | Description |
|------|-------------|
| `boolean` | returns true if multiaddr is a loopback address, false otherwise |

### Example

```js
const multiaddr = require('multiaddr')
const isLoopback = require('libp2p-utils/src/multiaddr/is-loopback')

const ma = multiaddr('/ip4/127.0.0.1/tcp/1000')
isMultiaddrLoopbackAddrs = isLoopback(ma)
```

## multiaddr `.isPrivate(ma)`

Check if a given multiaddr has a private address.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| ma | `Multiaddr` | multiaddr to verify |

### Returns

| Type | Description |
|------|-------------|
| `boolean` | returns true if multiaddr is a private address, false otherwise |

### Example

```js
const multiaddr = require('multiaddr')
const isPrivate = require('libp2p-utils/src/multiaddr/is-private')

const ma = multiaddr('/ip4/10.0.0.1/tcp/1000')
isMultiaddrPrivateAddrs = isPrivate(ma)
```

## ipPortToMultiaddr(ip, port)

Transform an IP, Port pair into a multiaddr with tcp transport.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| ip | `string` | ip for multiaddr |
| port | `number|string` | port for multiaddr |

### Returns

| Type | Description |
|------|-------------|
| `Multiaddr` | returns created multiaddr |

### Example

```js
const ipPortPairToMultiaddr = require('libp2p-utils/src/multiaddr/ip-port-to-multiaddr')
const ip = '127.0.0.1'
const port = '9090'

const ma = ipPortPairToMultiaddr(ma)
```

## streamToMaConnection(streamProperties, options)

Convert a duplex stream into a [MultiaddrConnection](https://github.com/libp2p/interface-transport#multiaddrconnection).

### Parameters

| Name | Type | Description |
|------|------|-------------|
| streamProperties | `object` | duplex stream properties |
| streamProperties.stream | [`DuplexStream`](https://github.com/libp2p/js-libp2p/blob/master/doc/STREAMING_ITERABLES.md#duplex) | duplex stream |
| streamProperties.remoteAddr | `Multiaddr` | stream remote address |
| streamProperties.localAddr | `Multiaddr` | stream local address |
| [options] | `object` | options |
| [options.signal] | `AbortSignal` | abort signal |

### Returns

| Type | Description |
|------|-------------|
| `Connection` | returns a multiaddr [Connection](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/connection) |

### Example

```js
const streamToMaConnection = require('libp2p-utils/src/stream-to-ma-conn')

const stream = {
  sink: async source => {/* ... */},
  source: { [Symbol.asyncIterator] () {/* ... */} }
}

const conn = streamToMaConnection({
  stream,
  remoteAddr: /* ... */
  localAddr; /* ... */
})
```
