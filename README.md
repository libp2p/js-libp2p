# js-libp2p-circuit

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/libp2p/js-libp2p-circuit.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-circuit)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-circuit/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-circuit?branch=master)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-circuit.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-circuit)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> Node.js implementation of the Circuit module that libp2p uses, which implements the [interface-connection](https://github.com/libp2p/interface-connection) interface for dial/listen.

`libp2p-circuit` implements the circuit-relay mechanism that allows nodes that don't speak the same protocol to communicate using a third _relay_ node.

**Note:** This module uses [pull-streams](https://pull-stream.github.io) for all stream based interfaces.

### Why?

`circuit-relaying` uses additional nodes in order to transfer traffic between two otherwise unreachable nodes. This allows nodes that don't speak the same protocols or are running in limited environments, e.g. browsers and IoT devices, to communicate, which would otherwise be impossible given the fact that for example browsers don't have any socket support and as such cannot be directly dialed.

The applicability of circuit-relaying is not limited to routing traffic between browser nodes, other uses include:
 - routing traffic between private nets
 - circumventing NAT layers
 - route mangling for better privacy (matreshka/shallot dialing).

 It's also possible to use it for clients that implement exotic transports such as  devices that only have bluetooth radios to be reachable over bluetooth enabled relays and become full p2p nodes.

### libp2p-circuit and IPFS

Prior to `libp2p-circuit` there was a rift in the IPFS network, were IPFS nodes could only access content from nodes that speak the same protocol, for example TCP only nodes could only dial to other TCP only nodes, same for any other protocol combination. In practice, this limitation was most visible in JS-IPFS browser nodes, since they can only dial out but not be dialed in over WebRTC or WebSockets, hence any content that the browser node held was not reachable by the rest of the network even through it was announced on the DHT. Non browser IPFS nodes would usually speak more than one protocol such as TCP, WebSockets and/or WebRTC, this made the problem less severe outside of the browser. `libp2p-circuit` solves this problem completely, as long as there are `relay nodes` capable of routing traffic between those nodes their content should be available to the rest of the IPFS network.

## Table of Contents

- [Install](#install)
  - [npm](#npm)
- [Usage](#usage)
  - [Example](#example)
  - [This module uses `pull-streams`](#this-module-uses-pull-streams)
    - [Converting `pull-streams` to Node.js Streams](#converting-pull-streams-to-nodejs-streams)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Install

### npm

```sh
> npm i libp2p-circuit
```

## Usage

### Example

#### Create dialer/listener

```js
const Circuit = require('libp2p-circuit')
const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const mh1 = multiaddr('/p2p-circuit/ipfs/QmHash') // dial /ipfs/QmHash over any circuit

const circuit = new Circuit(swarmInstance, options) // pass swarm instance and options

const listener = circuit.createListener(mh1, (connection) => {
  console.log('new connection opened')
  pull(
    pull.values(['hello']),
    socket
  )
})

listener.listen(() => {
  console.log('listening')

  pull(
    circuit.dial(mh1),
    pull.log,
    pull.onEnd(() => {
      circuit.close()
    })
  )
})
```

Outputs:

```sh
listening
new connection opened
hello
```

#### Create `relay`

```js
const Relay = require('libp2p-circuit').Realy

const relay = new Relay(options)

relay.mount(swarmInstance) // start relaying traffic
```

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/dominictarr/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.

## API

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

`libp2p-circuit` accepts Circuit addresses for both IPFS and non IPFS encapsulated addresses, i.e:

`/p2p-circuit/ip4/127.0.0.1/tcp/4001/ipfs/QmHash`

Both for dialing and listening.

### Implementation rational

This module is not a transport, however it implements `interface-transport` interface in order to allow circuit to be plugged with `libp2p-swarm`. The rational behind it is that, `libp2p-circuit` has a dial and listen flow, which fits nicely with other transports, moreover, it requires the _raw_ connection to be encrypted and muxed just as a regular transport's connection does. All in all, `interface-transport` ended up being the correct level of abstraction for circuit, as well as allowed us to reuse existing integration points in `libp2p-swarm` and `libp2p` without adding any ad-hoc logic. All parts of `interface-transport` are used, including `.getAddr` which returns a list of `/p2p-circuit` addresses that circuit is currently listening.

```
                                                                                                                                                   
 libp2p                                                                                  libp2p-circuit                                            
+-------------------------------------------------+                                     +---------------------------------------------------------+
|                                                 |                                     |                                                         |
|        +---------------------------------+      |                                     |                                                         |
|        |                                 |      |                                     |          +------------------------+                     |
|        |                                 |      |  circuit-relay registers the /hop   |          |                        |                     |
|        |           libp2p-swarm          |<----------------------------------------------------->|   circuit-relay        |                     |
|        |                                 |      |  multistream handler with the swarm |          |                        |                     |
|        |                                 |      |  to handle incomming dial requests  |          +------------------------+                     |
|        +---------------------------------+      |  from other nodes                   |        transport                                        |
|         ^      ^  ^ ^    ^           ^          |                                     |        +-------------------------------------------+    |
|         |      |  | |    |           |          |                                     |        |    +----------------------------------+   |    |
|         |      |  | |    |           |          |  dialer uses the swarm to dial to a |        |    |                                  |   |    |
|         |      |  | +------------------------------------------------------------------------------>|             dialer               |   |    |
|         |      |transports           |          |  relay node  listening on the /hop  |        |    |                                  |   |    |
|         |      |  |      |           |          |  multistream endpoint               |        |    +----------------------------------+   |    |
|         |      |  |      |           |          |                                     |        |                                           |    |
|         v      v  |      v           v          |                                     |        |                                           |    |
|+------------------|----------------------------+|                                     |        |    +----------------------------------+   |    |
||           |      |    |      |                ||                                     |        |    |                                  |   |    |
||libp2p-tcp |libp2p-ws  | .... |libp2p-circuit  ||listener registers a /stop multistream        |    |            listener              |   |    |
||           |      +-------------------------------------------------------------------------------->|                                  |   |    |
||           |           |      |pluggs in just  ||handler with the swarm to handle     |        |    +----------------------------------+   |    |
||           |           |      |as any other    ||incomming relay connections          |        |                                           |    |
||           |           |      |transport       ||                                     |        +-------------------------------------------+    |
|+-----------------------------------------------+|                                     |                                                         |
|                                                 |                                     |                                                         |
|                                                 |                                     |                                                         |
+-------------------------------------------------+                                     +---------------------------------------------------------+
```
                                                                         


## Contribute

Contributions are welcome! The libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

- [Check out the existing issues](//github.com/libp2p/js-libp2p-circuit/issues).
- **Perform code reviews**.
- **Add tests**. There can never be enough tests.

Please be aware that all interactions related to libp2p are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT](LICENSE) © 2017 Protocol Labs
