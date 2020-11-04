# Auto relay

Auto Relay enables libp2p nodes to dynamically find and bind to relays on the network. Once binding (listening) is done, the node can and should advertise its addresses on the network, allowing any other node to dial it over its bound relay(s).
While direct connections to nodes are preferable, it's not always possible to do so due to NATs or browser limitations.

## 0. Setup the example

Before moving into the examples, you should run `npm install` on the top level `js-libp2p` folder, in order to install all the dependencies needed for this example.

This example comes with 3 main files. A `relay.js` file to be used in the first step, a `auto-relay.js` file to be used in the second step and a `other-node.js` file to be used on the third step. All of this scripts will run their own libp2p node, which will interact with the previous ones. This way, you need to have all of them running as you proceed.

## 1. Set up a relay node

Aiming to support nodes with connectivity issues, you will need to set up a relay node for the former nodes to bind.

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
    // TODO check "What is next?" section
    // announce: ['/dns4/auto-relay.libp2p.io/tcp/443/wss/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3']
    // announceFilter: (addresses) => addresses
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

console.log(`Node started: ${node.peerId.toB58String()}`)
console.log('Listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
```

The Relay HOP advertise functionality is **NOT** required to be enabled. However, if you are interested in advertising on the network that this node is available to be used as a HOP Relay you can enable it.

You should now run the following to start the relay node:

```sh
node relay.js
```

This should print out something similar to the following:

```sh
Node started: QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3
Listening on:
/ip4/127.0.0.1/tcp/61592/ws/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3
/ip4/192.168.1.120/tcp/61592/ws/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3
```

TODO: Docker Image with a repo

## 2. Set up a node with Auto Relay Enabled

One of the typical use cases for Auto Relay is nodes behind a NAT or browser nodes thanks to their limitations regarding listening for new connections. For running a libp2p node that automatically binds itself to connected HOP relays, you can see the following:

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const pWaitFor = require('p-wait-for')

const relayAddr = process.argv[2]
if (!relayAddr) {
  throw new Error('the relay address needs to be specified as a parameter')
}

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
console.log(`Node started: ${node.peerId.toB58String()}`)

await node.dial(relayAddr)

// Wait for connection and relay to be bind for the example purpose
await pWaitFor(() => node.multiaddrs.length > 0)

console.log('connected to the HOP relay')
console.log('Listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
```

As you can see in the code, we need to provide the `relayAddr` as a process argument. This node will dial the relay and automatically bind to the relay.

You should now run the following to start the relay node:

```sh
node auto-relay.js /ip4/192.168.1.120/tcp/58941/ws/p2p/QmQKCBm87HQMbFqy14oqC85pMmnRrj6iD46ggM6reqNpsd
```

This should print out something similar to the following:

```sh
Node started: QmerrWofKF358JE6gv3z74cEAyL7z1KqhuUoVfGEynqjRm
connected to the HOP relay
Listening on:
/ip4/192.168.1.120/tcp/61592/ws/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit/p2p/QmerrWofKF358JE6gv3z74cEAyL7z1KqhuUoVfGEynqjRm
```

Per the address, it is possible to verify that the auto relay node is listening on the circuit relay node address.

Instead of dialing this relay manually, you could set up this node with the Bootstrap module and provide it in the bootstrap list. Moreover, you can use other `peer-discovery` modules to discover peers in the network and the node will automatically bind to the relays that support HOP until reaching the maximum number of listeners.

## 3. Set up another node for testing connectivity

Now that you have a relay node and a node bound to that relay, you can test connecting to the auto relay node via the relay.

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const autoRelayNodeAddr = process.argv[2]
if (!autoRelayNodeAddr) {
  throw new Error('the auto relay node address needs to be specified')
}

const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    connEncryption: [NOISE],
    streamMuxer: [MPLEX]
  }
})

await node.start()
console.log(`Node started: ${node.peerId.toB58String()}`)

const conn = await node.dial(autoRelayNodeAddr)
console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
```

You should now run the following to start the relay node using the listen address from step 2:

```sh
node other-node.js /ip4/192.168.1.120/tcp/58941/ws/p2p/QmQKCBm87HQMbFqy14oqC85pMmnRrj6iD46ggM6reqNpsd
```

Once you start your test node, it should print out something similar to the following:

```sh
Node started: Qme7iEzDxFoFhhkrsrkHkMnM11aPYjysaehP4NZeUfVMKG
Connected to the auto relay node via /ip4/192.168.1.120/tcp/61592/ws/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit/p2p/QmerrWofKF358JE6gv3z74cEAyL7z1KqhuUoVfGEynqjRm
```

As you can see from the output, the remote address of the established connection uses the relayed connection.

## 4. What is next?

Before moving into production, there are a few things that you should take into account.

A relay node should not advertise its private address in a real world scenario, as the node would not be reachable by others. You should provide an array of public addresses in the libp2p `addresses.announce` option. If you are using websockets, bear in mind that due to browser’s security policies you cannot establish unencrypted connection from secure context. The simplest solution is to setup SSL with nginx and proxy to the node and setup a domain name for the certificate.
