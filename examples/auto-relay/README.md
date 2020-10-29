# Auto relay

Auto Relay enables libp2p nodes to dynamically find and bind to relays on the network. Once binding (listening) is done, the node can and should advertise its addresses to the network, allowing any other node to dial it over its bound relay(s).
While direct connections to nodes are preferable, it's not always possible to do so due to NATs or browser limitations.

## 0. Setup the example

Before moving into the examples, you should run `npm install` on the top level folder of libp2p, in order to install all the dependencies needed for these examples.

This example comes with 3 main files to run. A `relay.js` file to be used in the first step, a `auto-relay.js` file to be used in the second step and a `other-node.js` file to be used on the third step. All of this scripts will run their own libp2p node, which will interact with the previous ones. This way, you need to have all of them running as you proceed.

## 1. Set up a relay node

Aiming to support nodes with connectivity difficulties, you will need to set up a relay node for the former nodes to bind.

The relay node will need to have its relay subsystem enabled, as well as its HOP capability. It can be configured as follows:

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    connEncryption: [NOISE],
    streamMuxer: [MPLEX]
  },
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0/ws']
    // announceFilter: TODO check "What is next?" section
  },
  config: {
    relay: {
      enabled: true,
      hop: {
        enabled: true
      },
      advertise: {
        enabled: true,
      }
    }
  }
})

await node.start()

console.log(`Node started. ${node.peerId.toB58String()}`)
console.log('Listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
```

The Relay HOP advertise functionality is **NOT** required to be enabled. However, if you are interested in advertising on the network that this node is available to be used as a HOP Relay you can enable it.

Once you start your relay node with `node relay.js`, it should print out something similar to the following:

```sh
Node started. QmQKCBm87HQMbFqy14oqC85pMmnRrj6iD46ggM6reqNpsd
Listening on:
/ip4/127.0.0.1/tcp/58941/ws/p2p/QmQKCBm87HQMbFqy14oqC85pMmnRrj6iD46ggM6reqNpsd
/ip4/192.168.1.120/tcp/58941/ws/p2p/QmQKCBm87HQMbFqy14oqC85pMmnRrj6iD46ggM6reqNpsd
```

TODO: Docker Image with a repo

## 2. Set up a node with Auto Relay Enabled

One of the typical use cases for Auto Relay is nodes behind a NAT or browser nodes thanks to their limitations regarding listening for new connections.

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

// TODO: get the relay address from the previous step
const relayAddr = undefined

const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    connEncryption: [NOISE],
    streamMuxer: [MPLEX]
  },
  config: {
    relay: {
      enabled: true,
      autoRelay: {
        enabled: true,
        maxListeners: 2
      }
    }
  }
})

await node.start()
console.log(`Node started. ${node.peerId.toB58String()}`)
console.log('Listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))

await node.dial(relayAddr)
console.log('connected to the HOP relay')
console.log('Listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
```

Before starting your node leveraging auto relay, you need to fill in the `relayAddr` in the code with the relay listening address from step 1.

Once you start your auto relay node with `node auto-relay.js`, it should print out something similar to the following:

```sh
Node started. QmSmhZ1pTV5ox7DUfG8QPSwyNyXGsWUeTCEWXfH7MVXLfi
connected to the HOP relay
Listening on:
/ip4/192.168.1.120/tcp/60288/ws/p2p/QmNusKcZR1WNKEJqvPeKtPfzHxAviqH5P2RxyKRqynV6WD/p2p-circuit/p2p/QmSmhZ1pTV5ox7DUfG8QPSwyNyXGsWUeTCEWXfH7MVXLfi
```

Per the address, it is possible to verify that the auto relay node is listening on the circuit relay node address.

Instead of dialing this relay manually, you could set up this node with the Bootstrap module and provide it in the bootstrap list.

## 3. Set up another node for testing connectivity

Now that you have set up a relay node and a node leveraging that relay with auto relay, you can test connecting to the auto relay node via the relay.

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

// TODO: get the auto relay address from the previous step
const autoRelayNodeAddr = undefined

const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    connEncryption: [NOISE],
    streamMuxer: [MPLEX]
  }
})

await node.start()

const conn = await node.dial(autoRelayNodeAddr)
console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
```

Before starting your node leveraging auto relay, you need to fill in the `autoRelayNodeAddr` in the code with the relay listening address from step 2.

Once you start your test node with `node other-relay.js`, it should print out something similar to the following:

```sh
Connected to the auto relay node via /ip4/192.168.1.120/tcp/61470/ws/p2p/Qme1DfXDeaMEPNsUrG8EFXj2JDqzpgy9LuD6mpqpBsNwTm/p2p-circuit/p2p/Qmch46oemLTk6HJX1Yzm8gVRLPvBStoMQNniB37mX34RqM
```

## 4. What is next?

- Private addr
- Use `webrtc-star` for discovering other peers (will get both announced addresses that might be used on peer exchange/DHT queries)
  - Check libp2p in the browser example...
- Infra guide?
