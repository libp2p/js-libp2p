libp2p-switch JavaScript implementation
======================================

> libp2p-switch is a dialer machine, it leverages the multiple libp2p transports, stream muxers, crypto channels and other connection upgrades to dial to peers in the libp2p network. It also supports Protocol Multiplexing through a multicodec and multistream-select handshake.

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-switch.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Create a libp2p switch](#create-a-libp2p-switch)
- [API](#api)
  - [`switch.connection`](#switchconnection)
  - [`switch.dial(peer, protocol, callback)`](#switchdialpeer-protocol-callback)
  - [`switch.dialFSM(peer, protocol, callback)`](#switchdialfsmpeer-protocol-callback)
  - [`switch.handle(protocol, handlerFunc, matchFunc)`](#switchhandleprotocol-handlerfunc-matchfunc)
  - [`switch.hangUp(peer, callback)`](#switchhanguppeer-callback)
  - [`switch.start(callback)`](#switchstartcallback)
  - [`switch.stop(callback)`](#switchstopcallback)
  - [`switch.stats`](#stats-api)
  - [`switch.unhandle(protocol)`](#switchunhandleprotocol)
  - [Internal Transports API](#internal-transports-api)
- [Design Notes](#design-notes)
  - [Multitransport](#multitransport)
  - [Connection upgrades](#connection-upgrades)
  - [Identify](#identify)
  - [Notes](#notes)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
> npm install libp2p-switch --save
```

## Usage

### Create a libp2p Switch

```JavaScript
const switch = require('libp2p-switch')

const sw = new switch(peerInfo , peerBook [, options])
```

If defined, `options` should be an object with the following keys and respective values:

- `denyTTL`: - number of ms a peer should not be dialable to after it errors. Each successive deny will increase the TTL from the base value. Defaults to 5 minutes
- `denyAttempts`: - number of times a peer can be denied before they are permanently denied. Defaults to 5.
- `maxParallelDials`: - number of concurrent dials the switch should allow. Defaults to `100`
- `maxColdCalls`: - number of queued cold calls that are allowed. Defaults to `50`
- `dialTimeout`: - number of ms a dial to a peer should be allowed to run. Defaults to `30000` (30 seconds)
- `stats`: an object with the following keys and respective values:
  - `maxOldPeersRetention`: maximum old peers retention. For when peers disconnect and keeping the stats around in case they reconnect. Defaults to `100`.
  - `computeThrottleMaxQueueSize`: maximum queue size to perform stats computation throttling. Defaults to `1000`.
  - `computeThrottleTimeout`: Throttle timeout, in miliseconds. Defaults to `2000`,
  - `movingAverageIntervals`: Array containin the intervals, in miliseconds, for which moving averages are calculated. Defaults to:

  ```js
  [
    60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000 // 15 minutes
  ]
  ```

### Private Networks

libp2p-switch supports private networking. In order to enabled private networks, the `switch.protector` must be
set and must contain a `protect` method. You can see an example of this in the [private network
tests]([./test/pnet.node.js]).

## API

- peerInfo is a [PeerInfo](https://github.com/libp2p/js-peer-info) object that has the peer information.
- peerBook is a [PeerBook](https://github.com/libp2p/js-peer-book) object that stores all the known peers.

### `switch.connection`

##### `switch.connection.addUpgrade()`

A connection upgrade must be able to receive and return something that implements the [interface-connection](https://github.com/libp2p/interface-connection) specification.

> **WIP**

##### `switch.connection.addStreamMuxer(muxer)`

Upgrading a connection to use a stream muxer is still considered an upgrade, but a special case since once this connection is applied, the returned obj will implement the [interface-stream-muxer](https://github.com/libp2p/interface-stream-muxer) spec.

- `muxer`

##### `switch.connection.reuse()`

Enable the identify protocol.

##### `switch.connection.crypto([tag, encrypt])`

Enable a specified crypto protocol. By default no encryption is used, aka `plaintext`. If called with no arguments it resets to use `plaintext`.

You can use for example [libp2p-secio](https://github.com/libp2p/js-libp2p-secio) like this

```js
const secio = require('libp2p-secio')
switch.connection.crypto(secio.tag, secio.encrypt)
```

##### `switch.connection.enableCircuitRelay(options, callback)`

Enable circuit relaying.

- `options`
    - enabled - activates relay dialing and listening functionality
    - hop - an object with two properties
        - enabled - enables circuit relaying
        - active - is it an active or passive relay (default false)
- `callback`

### `switch.dial(peer, protocol, callback)`

dial uses the best transport (whatever works first, in the future we can have some criteria), and jump starts the connection until the point where we have to negotiate the protocol. If a muxer is available, then drop the muxer onto that connection. Good to warm up connections or to check for connectivity. If we have already a muxer for that peerInfo, then do nothing.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `protocol`
- `callback`

### `switch.dialFSM(peer, protocol, callback)`

works like dial, but calls back with a [Connection State Machine](#connection-state-machine)

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `protocol`: String that defines the protocol (e.g '/ipfs/bitswap/1.1.0') to be used
- `callback`: Function with signature `function (err, connFSM) {}` where `connFSM` is a [Connection State Machine](#connection-state-machine)

#### Connection State Machine
Connection state machines emit a number of events that can be used to determine the current state of the connection
and to received the underlying connection that can be used to transfer data.

### `switch.dialer.connect(peer, options, callback)`

a low priority dial to the provided peer. Calls to `dial` and `dialFSM` will take priority. This should be used when an application only wishes to establish connections to new peers, such as during peer discovery when there is a low peer count. Currently, anything greater than the HIGH_PRIORITY (10) will be placed into the cold call queue, and anything less than or equal to the HIGH_PRIORITY will be added to the normal queue.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `options`: Optional
- `options.priority`: Number of the priority of the dial, defaults to 20.
- `options.useFSM`: Boolean of whether or not to callback with a [Connection State Machine](#connection-state-machine)
- `callback`: Function with signature `function (err, connFSM) {}` where `connFSM` is a [Connection State Machine](#connection-state-machine)

##### Events
- `error`:  emitted whenever a fatal error occurs with the connection; the error will be emitted.
- `error:upgrade_failed`: emitted whenever the connection fails to upgrade with a muxer, this is not fatal.
- `error:connection_attempt_failed`: emitted whenever a dial attempt fails for a given transport. An array of errors is emitted.
- `connection`: emitted whenever a useable connection has been established; the underlying [Connection](https://github.com/libp2p/interface-connection) will be emitted.
- `close`: emitted when the connection has closed.

### `switch.handle(protocol, handlerFunc, matchFunc)`

Handle a new protocol.

- `protocol`
- `handlerFunc` - function called when we receive a dial on `protocol. Signature must be `function (protocol, conn) {}`
- `matchFunc` - matchFunc for multistream-select

### `switch.hangUp(peer, callback)`

Hang up the muxed connection we have with the peer.

- `peer`: can be an instance of [PeerInfo][], [PeerId][] or [multiaddr][]
- `callback`

### `switch.on('error', (err) => {})`

Emitted when the switch encounters an error.

- `err`: instance of [Error][]

### `switch.on('peer-mux-established', (peer) => {})`

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just established a muxed connection with.

### `switch.on('peer-mux-closed', (peer) => {})`

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just closed a muxed connection with.

### `switch.on('connection:start', (peer) => {})`
This will be triggered anytime a new connection is created.

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just started a connection with.

### `switch.on('connection:end', (peer) => {})`
This will be triggered anytime an existing connection, regardless of state, is removed from the switch's internal connection tracking.

- `peer`: is instance of [PeerInfo][] that has info of the peer we have just closed a connection with.

### `switch.on('start', () => {})`

Emitted when the switch has successfully started.

### `switch.on('stop', () => {})`

Emitted when the switch has successfully stopped.

### `switch.start(callback)`

Start listening on all added transports that are available on the current `peerInfo`.

### `switch.stop(callback)`

Close all the listeners and muxers.

- `callback`

### Stats API

##### `switch.stats.emit('update')`

Every time any stat value changes, this object emits an `update` event.

#### Global stats

##### `switch.stats.global.snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number

##### `switch.stats.global.movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-transport stats

##### `switch.stats.transports()`

Returns an array containing the tags (string) for each observed transport.

##### `switch.stats.forTransport(transportTag).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number

##### `switch.stats.forTransport(transportTag).movingAverages`

Returns an object containing the following keys:

 dataSent
 dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-protocol stats

##### `switch.stats.protocols()`

Returns an array containing the tags (string) for each observed protocol.

##### `switch.stats.forProtocol(protocolTag).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number


##### `switch.stats.forProtocol(protocolTag).movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Per-peer stats

##### `switch.stats.peers()`

Returns an array containing the peerIDs (B58-encoded string) for each observed peer.

##### `switch.stats.forPeer(peerId:String).snapshot`

Should return a stats snapshot, which is an object containing the following keys and respective values:

- dataSent: amount of bytes sent, [Big](https://github.com/MikeMcl/big.js#readme) number
- dataReceived: amount of bytes received, [Big](https://github.com/MikeMcl/big.js#readme) number


##### `switch.stats.forPeer(peerId:String).movingAverages`

Returns an object containing the following keys:

- dataSent
- dataReceived

Each one of them contains an object that has a key for each interval (`60000`, `300000` and `900000` miliseconds).

Each one of these values is [an exponential moving-average instance](https://github.com/pgte/moving-average#readme).

#### Stats update interval

Stats are not updated in real-time. Instead, measurements are buffered and stats are updated at an interval. The maximum interval can be defined through the `Switch` constructor option `stats.computeThrottleTimeout`, defined in miliseconds.

### `switch.unhandle(protocol)`

Unhandle a protocol.

- `protocol`

### Internal Transports API

##### `switch.transport.add(key, transport, options)`

libp2p-switch expects transports that implement [interface-transport](https://github.com/libp2p/interface-transport). For example [libp2p-tcp](https://github.com/libp2p/js-libp2p-tcp).

- `key` - the transport identifier.
- `transport` -
- `options` -

##### `switch.transport.dial(key, multiaddrs, callback)`

Dial to a peer on a specific transport.

- `key`
- `multiaddrs`
- `callback`

##### `switch.transport.listen(key, options, handler, callback)`

Set a transport to start listening mode.

- `key`
- `options`
- `handler`
- `callback`

##### `switch.transport.close(key, callback)`

Close the listeners of a given transport.

- `key`
- `callback`

## Design Notes

### Multitransport

libp2p is designed to support multiple transports at the same time. While peers are identified by their ID (which are generated from their public keys), the addresses of each pair may vary, depending the device where they are being run or the network in which they are accessible through.

In order for a transport to be supported, it has to follow the [interface-transport](https://github.com/libp2p/interface-transport) spec.

### Connection upgrades

Each connection in libp2p follows the [interface-connection](https://github.com/libp2p/interface-connection) spec. This design decision enables libp2p to have upgradable transports.

We think of `upgrade` as a very important notion when we are talking about connections, we can see mechanisms like: stream multiplexing, congestion control, encrypted channels, multipath, simulcast, etc, as `upgrades` to a connection. A connection can be a simple and with no guarantees, drop a packet on the network with a destination thing, a transport in the other hand can be a connection and or a set of different upgrades that are mounted on top of each other, giving extra functionality to that connection and therefore `upgrading` it.

Types of upgrades to a connection:

- encrypted channel (with TLS for e.g)
- congestion flow (some transports don't have it by default)
- multipath (open several connections and abstract it as a single connection)
- simulcast (still really thinking this one through, it might be interesting to send a packet through different connections under some hard network circumstances)
- stream-muxer - this a special case, because once we upgrade a connection to a stream-muxer, we can open more streams (multiplex them) on a single stream, also enabling us to reuse the underlying dialed transport

We also want to enable flexibility when it comes to upgrading a connection, for example, we might that all dialed transports pass through the encrypted channel upgrade, but not the congestion flow, specially when a transport might have already some underlying properties (UDP vs TCP vs WebRTC vs every other transport protocol)

### Identify

Identify is a protocol that switchs mounts on top of itself, to identify the connections between any two peers. E.g:

- a) peer A dials a conn to peer B
- b) that conn gets upgraded to a stream multiplexer that both peers agree
- c) peer B executes de identify protocol
- d) peer B now can open streams to peer A, knowing which is the
identity of peer A

In addition to this, we also share the "observed addresses" by the other peer, which is extremely useful information for different kinds of network topologies.

### Notes

To avoid the confusion between connection, stream, transport, and other names that represent an abstraction of data flow between two points, we use terms as:

- connection - something that implements the transversal expectations of a stream between two peers, including the benefits of using a stream plus having a way to do half duplex, full duplex
- transport - something that as a dial/listen interface and return objs that implement a connection interface

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/pull-stream/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.
