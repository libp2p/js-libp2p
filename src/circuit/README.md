# js-libp2p-circuit

> Node.js implementation of the Circuit module that libp2p uses, which implements the [interface-connection](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/connection) interface for dial/listen.

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-circuit.

`libp2p-circuit` implements the circuit-relay mechanism that allows nodes that don't speak the same protocol to communicate using a third _relay_ node. You can read more about this in its [spec](https://github.com/libp2p/specs/tree/master/relay).

## Table of Contents

- [js-libp2p-circuit](#js-libp2p-circuit)
  - [Table of Contents](#table-of-contents)
    - [Why?](#why)
    - [libp2p-circuit and IPFS](#libp2p-circuit-and-ipfs)
  - [Usage](#usage)
  - [API](#api)
    - [Implementation rational](#implementation-rational)

### Why?

`circuit-relaying` uses additional nodes in order to transfer traffic between two otherwise unreachable nodes. This allows nodes that don't speak the same protocols or are running in limited environments, e.g. browsers and IoT devices, to communicate, which would otherwise be impossible given the fact that for example browsers don't have any socket support and as such cannot be directly dialed.

The use of circuit-relaying is not limited to routing traffic between browser nodes, other uses include:
 - routing traffic between private nets and circumventing NAT layers
 - route mangling for better privacy (matreshka/shallot dialing).

It's also possible to use it for clients that implement exotic transports such as  devices that only have bluetooth radios to be reachable over bluetooth enabled relays and become full p2p nodes.

### libp2p-circuit and IPFS

Prior to `libp2p-circuit` there was a rift in the IPFS network, were IPFS nodes could only access content from nodes that speak the same protocol, for example TCP only nodes could only dial to other TCP only nodes, same for any other protocol combination. In practice, this limitation was most visible in JS-IPFS browser nodes, since they can only dial out but not be dialed in over WebRTC or WebSockets, hence any content that the browser node held was not reachable by the rest of the network even through it was announced on the DHT. Non browser IPFS nodes would usually speak more than one protocol such as TCP, WebSockets and/or WebRTC, this made the problem less severe outside of the browser. `libp2p-circuit` solves this problem completely, as long as there are `relay nodes` capable of routing traffic between those nodes their content should be available to the rest of the IPFS network.

## Usage

Libp2p circuit configuration can be seen at [Setup with Relay](../../doc/CONFIGURATION.md#setup-with-relay).

Once you have a circuit relay node running, you can configure other nodes to use it as a relay as follows:

```js
import { multiaddr } from '@multiformats/multiaddr'
import Libp2p from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'

const relayAddr = ...

const node = await createLibp2p({
  addresses: {
    listen: [multiaddr(`${relayAddr}/p2p-circuit`)]
  },
  transports: [
    new TCP()
  ],
  streamMuxers: [
    new Mplex()
    ],
  connectionEncryption: [
    new Noise()
  ]
  },
  config: {
    relay: {                   // Circuit Relay options (this config is part of libp2p core configurations)
      enabled: true           // Allows you to dial and accept relayed connections. Does not make you a relay.
    }
  }
})
```

## API

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

`libp2p-circuit` accepts Circuit addresses for both IPFS and non IPFS encapsulated addresses, i.e:

`/p2p-circuit/ip4/127.0.0.1/tcp/4001/p2p/QmHash`

Both for dialing and listening.

### Implementation rational

This module is not a transport, however it implements `interface-transport` interface in order to allow circuit to be plugged with `libp2p`. The rational behind it is that, `libp2p-circuit` has a dial and listen flow, which fits nicely with other transports, moreover, it requires the _raw_ connection to be encrypted and muxed just as a regular transport's connection does. All in all, `interface-transport` ended up being the correct level of abstraction for circuit, as well as allowed us to reuse existing integration points in `libp2p` and `libp2p` without adding any ad-hoc logic. All parts of `interface-transport` are used, including `.getAddr` which returns a list of `/p2p-circuit` addresses that circuit is currently listening.

```
libp2p                                                                                  libp2p-circuit (transport)
+-------------------------------------------------+                                     +--------------------------+
|        +---------------------------------+      |                                     |                          |
|        |                                 |      |                                     |   +------------------+   |
|        |                                 |      |  circuit-relay listens for the HOP  |   |                  |   |
|        |              libp2p             <------------------------------------------------|  circuit-relay   |   |
|        |                                 |      |  message to handle incomming relay  |   |                  |   |
|        |                                 |      |  requests from other nodes          |   +------------------+   |
|        +---------------------------------+      |                                     |                          |
|         ^     ^   ^  ^   ^           ^          |                                     |   +------------------+   |
|         |     |   |  |   |           |          |                                     |   | +-------------+  |   |
|         |     |   |  |   |           |          |      dialer uses libp2p to dial     |   | |             |  |   |
|         |     |   |  +---------------------------------------------------------------------->   dialer    |  |   |
|         |     | transports           |          |  to a circuit-relay node using the  |   | |             |  |   |
|         |     |   |      |           |          |  HOP message                        |   | +-------------+  |   |
|         |     |   |      |           |          |                                     |   |                  |   |
|         v     v   |      v           v          |                                     |   |                  |   |
|+------------------|----------------------------+|                                     |   |  +-------------+ |   |
||           |      |    |      |                ||                                     |   |  |             | |   |
||libp2p-tcp |libp2p-ws  | .... |libp2p-circuit  ||  listener handles STOP messages from|   |  | listener    | |   |
||           |      +-------------------------------------------------------------------------->             | |   |
||           |           |      |plugs in just   ||  circuit-relay nodes                |   |  +-------------+ |   |
||           |           |      |as any other    ||                                     |   |                  |   |
||           |           |      |transport       ||                                     |   +------------------+   |
|+-----------------------------------------------+|                                     |                          |
+-------------------------------------------------+                                     +--------------------------+
```
