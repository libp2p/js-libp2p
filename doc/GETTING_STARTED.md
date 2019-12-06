# GETTING STARTED

Welcome to libp2p, let's get you setup your first and fully functional libp2p node 🚀

- [Getting Started](#getting-started)
  - [Install](#install)
  - [Usage](#usage)
    - [Basic setup](#basic-setup)
      - [Transport](#transport)
      - [Connection Encryption](#connection-encryption)
      - [Overview](#overview)
    - [Custom setup](#custom-setup)
      - [Multiplexing](#multiplexing)
      - [Peer Discovery](#peer-discovery)
      - [Peer Routing](#peer-routing)
      - [Content Routing](#content-routing)
      - [Pubsub](#pubsub)
  - [What is next](#what-is-next)

libp2p is a composable and modular networking stack, which empowers its users to just take the modules they need. All the flexibility it provides, in order to fulfil every network requirement comes with a cost. For getting a libp2p node running, users are faced with a large number of possible configuration setups, which involves a considerable number of concepts that they might not be familiar with.

This document intends to help in the first contact with `js-libp2p`.

## Install

The first step is to install libp2p in your project:

```sh
npm install libp2p
```

## Usage

Configuring libp2p should not be a single step, but a continuous task. This includes configuring libp2p to achieve all the project requirements, as well as possible optimizations. Regardless of how you configure libp2p, the top level API will always remain the same.

For creating a `js-libp2p` node you should use [Libp2p.create](./API.md#create). As stated in the API docs, we need to provide the [libp2p configuration](./CONFIGURATION.md) as a parameter. If you did not read the configuration document yet, it is worth you read it before continuing.

### Basic setup

The first step should be to just get a `js-libp2p` node running. The required modules for this are the **transport** and **connEncryption**. They must be provided via a `modules` property into the `Libp2p.create` options parameter.

#### Transports

Libp2p uses transports to establish connections between peers over the network. In other words, it can use one or more transports to dial and listen for connections.

These transports should be decided according to the runtime where you expect the application to run. Looking at the [available transports](./CONFIGURATION.md#transport), you might start by using `libp2p-tcp` if you are in a node.js environment, or `libp2p-websockets` and `libp2p-webrtc-star` in a browser environment (examples).

Taking into account a context where we are in a node.js environment, but have a requirement to just use `websockets`, we should go with `libp2p-websockets`. Start by installing that libp2p module:

```sh
npm install libp2p-websockets
```

and finally add it into the `modules.transport`, as an array:

```js
const Libp2p = require('libp2p')
const WEBSOCKETS = require('libp2p-websockets')

const node = await Libp2p.create({
  modules: {
    transport: [WEBSOCKETS]
  }
})
```

As other transports are being developed over time, you might reavaluate this choice later and add new transports that might suit better your requirements. You might want to remove the transports you had before, or just add new transports in order to be able to establish connections with peers only supporting those.

#### Connection Encryption

Libp2p does not make assumptions and allows developers to pick just the modules they need. However, it requires that all connections are encrypted to ensure that all exchanged data is properly protected.

Looking at the [available connection encryption](./CONFIGURATION.md#connection-encryption) protocols, you can start by using `libp2p-secio` and revisit this choice later on, as you get to know more about libp2p, as well as new other protocols for securing connections appear. You can install `libp2p-secio` and add it to your libp2p node as follows:

```sh
npm install libp2p-secio
```

```js
const Libp2p = require('libp2p')
const SECIO = require('libp2p-secio')

const node = await Libp2p.create({
  modules: {
    connEncryption: [SECIO]
  }
})
```

#### Overview

With the configuration achieved from the previous steps, you are now able to start your libp2p node, and even connect to other peers if the addresses of them are known to you. Now is a good time to revisit the [API](./API.md) document, more specifically [API#start](./API.md#start), [API#stop](./API.md#stop) and [API#dial](./API.md#dial). You can check the following example starting and stopping the node.

```js
const Libp2p = require('libp2p')
const WEBSOCKETS = require('libp2p-websockets')
const SECIO = require('libp2p-secio')

const node = await Libp2p.create({
  modules: {
    transport: [WEBSOCKETS],
    connEncryption: [SECIO]
  }
})

// start libp2p
await node.start()

// connect to a known peer through its multiaddr
// const ma = '/ip4/104.236.176.52/tcp/9000/ws/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z'
// await node.dial(ma)

// stop libp2p
await node.stop()
```

If you are not familiar with multiaddrs, you should read the [multiformats/js-multiaddr](https://github.com/multiformats/js-multiaddr) README.

### Custom setup

After having your libp2p node running, it is time to configure all its features according to your project needs.

#### Multiplexing

More than connecting with other peers, you want to have them communicating in a meaningful way to your application. With libp2p you are able to create your own protocols so that you can integrate your business logic into the network. As an example, you can create a chat protocol on top of libp2p and use it to exchange chat messages.

In this context, your node will not be efficient if you open multiple connections with a single peer to use different protocols. Therefore, each protocol works as an independent logical stream and you can use a stream multiplexer, in order to share a common underlying transport medium between streams (single connection).

Looking at the [available stream multiplexing](./CONFIGURATION.md#stream-multiplexing) protocols, we are only able to use `libp2p-mplex` for the time being. Bear in mind that future libp2p transports might have `multiplexing` capabilities already built-in (such as `QUIC`).

You can install `libp2p-mplex` and add it to your libp2p node as follows in the next example. You should revisit the [API](./API.md) document, more specifically [API#dial](./API.md#dial) and [API#handle](./API.md#handle). 

We will also install the next dependencies for easily work with [async iterable duplex streams](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9).

```sh
npm install libp2p-mplex
npm install it-pipe it-buffer streaming-iterables
```

```js
const Libp2p = require('libp2p')
const WEBSOCKETS = require('libp2p-websockets')
const SECIO = require('libp2p-secio')
const MPLEX = require('libp2p-mplex')

const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const { toBuffer } = require('it-buffer')

const node = await Libp2p.create({
  modules: {
    transport: [WEBSOCKETS],
    connEncryption: [SECIO],
    streamMuxer: [MPLEX]
  }
})

// start libp2p
await node.start()

// register protocol /double/1.0.0
// this protocol expects to receive numbers from
// other peers, double them and send them back
libp2p.handle('/double/1.0.0', ({ stream }) => {
  // Receive data from the stream
  // Make intended operations
  // Send the result back to the stream
  pipe(
    stream,
    toBuffer, // guarantee that we receive a buffer
    function transform (source) {
      return (async function * () {
        for await (const val of source) {
          // Needs to convert from buffer
          yield Number(val.toString()) * 2
        }
      })()
    },
    stream
  )
})

// connect to a known peer through its multiaddr
const ma = '/ip4/104.236.176.52/tcp/9000/ws/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z'
const conn = await node.dial(ma)

// the node should also support this protocol
// otherwise this will throw an error
const { stream } = await conn.newStream(['/double/1.0.0'])

const response = await pipe(
  [1, 2, 3],
  stream,
  collect
)
// response: [2, 4, 6]

// stop libp2p
await node.stop()
```

Protocols design is similar to an http api, where each protocol has an handler, receives a message and returns a response.

Note that there are a lot of useful modules for working with async iterables, you can find them on [alanshaw/it-awesome](https://github.com/alanshaw/it-awesome). For example, we could use [alanshaw/paramap-it](https://github.com/alanshaw/paramap-it) to simplify the transform function above.

#### Peer Discovery

In a P2P context, peer discovery is critical to a functioning system. It is not pratical to connect to all the peers we know manually, nor to get to know most of the peers' addresses in advance.

Looking at the [available peer discovery](./CONFIGURATION.md#peer-discovery) protocols, there are several options to be considered:
- If you already know the addresses of some other network peers, you should consider using `libp2p-bootstrap` as this is the easiest way of getting your peer into the network.
- If it is likely that you will have other peers on your network, `libp2p-mdns` is a must. It allows peers to discover each other when on the same local network with zero configuration. mDNS uses a multicast system of DNS records.
- In the event of working on a browser runtime, you must go with `js-libp2p-webrtc-star`.
- if you need to crawl the network and discover a large number of peers, `js-libp2p-kad-dht`.

Reviewing the events specification on [Libp2p.create](./API.md#create), each time a peer is discovered a `peer:discovery` event will be emitted by the node.

We will consider in this guide that we already know some peers and also that we are creating an application that might be used by people within the same office network. Accordingly, we will install `libp2p-bootstrap` and `libp2p-mdns`

```sh
npm install libp2p-bootstrap libp2p-mdns
```

We can provide specific configurations for each protocol within a `config.peerDiscovery` property in the options.

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const SECIO = require('libp2p-secio')
const MPLEX = require('libp2p-mplex')

const Bootstrap = require('libp2p-bootstap')
const MulticastDNS = require('libp2p-mdns')

// Known peers addresses
const bootstrappers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/ip4/104.236.176.52/tcp/4001/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z'
]

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    connEncryption: [SECIO],
    streamMuxer: [MPLEX],
    peerDiscovery: [Bootstrap, MulticastDNS]
  },
  config: {
    peerDiscovery: {
      autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minPeers)
      // The `tag` property will be searched when creating the instance of your Peer Discovery service.
      // The associated object, will be passed to the service when it is instantiated.
      [MulticastDNS.tag]: {
        interval: 1000,
        enabled: true
      },
      [Bootstrap.tag]: {
        interval: 20000,
        enabled: true,
        list: bootstrapers // provide array of peers
      }
    }
  }
})

node.on('peer:discovery', (peer) => {
  console.log(peer) // Log discovered peer
})

// start libp2p
await node.start()
```

#### Peer Routing

Peer Routing offers a way to find other peers in the network by issuing queries using a Peer Routing algorithm, through their peer ids.

Looking at the [available peer routing](./CONFIGURATION.md#peer-routing) protocols, we might choose `libp2p-kad-dht` or `libp2p-delegated-peer-routing`. If your runtime is a browser or a low power device, you might prefer to use `libp2p-delegated-peer-routing` as you are able to delegate other peer to issue the queries for you. However, you need to know a peer able to do that. Otherwise, you should use `libp2p-kad-dht`.

In this context, we will install the dht. You should revisit the [API](./API.md) document, more specifically [API#peerRouting.findPeer](./API.md#peerRoutingfindPeer).

```sh
npm install libp2p-kad-dht
```

`js-libp2p` configuration is not well defined yet regarding peer routing. Therefore, the `dht` should be plugged through a `modules.dht` property, while the `libp2p-delegated-peer-routing` should be plugged into `modules.peerRouting` array.

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const DHT = require('libp2p-kad-dht')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    dht: DHT
  },
  config: {
    dht: { // The DHT options (and defaults) can be found in its documentation
      enabled: true,
      randomWalk: {
        enabled: false, // dht discovery (enabled by default)
        interval: 300e3,
        timeout: 10e3
      }
    }
  }
})

// start libp2p
await node.start()

// Find peer
const peerInfo = await libp2p.peerRouting.findPeer(peerId)

// ...
```

You can find out more about peer routing on the example provided on [./CONFIGURATION.md#setup-with-content-and-peer-routing](./CONFIGURATION.md#setup-with-content-and-peer-routing).

#### Content Routing

Content routing provides a way to find where content lives in the network. It works in two steps: 1) Peers provide (announce) to the network that they are holders of specific content and 2) Peers issue queries to find where that content lives. A Content Routing mechanism could be as complex as a DHT or as simple as a registry somewhere in the network.

Looking at the [available content routing](./CONFIGURATION.md#content-routing) protocols, we might choose `libp2p-kad-dht` or `libp2p-delegated-content-routing`. If of your runtime is a browser or a low power device, you might prefer to use `libp2p-delegated-peer-routing` as you are able to delegate other peer to issue the queries for you. However, you need to know a peer able to do that. Otherwise, you should use `libp2p-kad-dht`.

In this context, we will install the dht. You should revisit the [API](./API.md) document, more specifically [API#contentrouting.findProviders](./API.md#contentroutingfindproviders), [API#contentrouting.provide](./API.md#contentroutingprovide), [API#contentrouting.put](./API.md#contentroutingput), [API#contentrouting.get](./API.md#contentroutingget) and [API#contentrouting.contentrouting.getMany](./API.md#contentroutingcontentroutinggetmany).

```sh
npm install libp2p-kad-dht
```

`js-libp2p` configuration is not well defined yet regarding content routing routing. Therefore, the `dht` should be plugged through a `modules.dht` property, while the `libp2p-delegated-content-routing` should be plugged into `modules.contentRouting` array.

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const DHT = require('libp2p-kad-dht')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    dht: DHT
  },
  config: {
    dht: { // The DHT options (and defaults) can be found in its documentation
      enabled: true,
      randomWalk: {
        enabled: false, // dht discovery (enabled by default)
        interval: 300e3,
        timeout: 10e3
      }
    }
  }
})

// start libp2p
await node.start()

// provide cid
await libp2p.contentRouting.provide(cid)

// get providers for a cid
for await (const provider of libp2p.contentRouting.findProviders(cid2)) {
  console.log(provider)
}

// ...
```

If you are not familiar with `CIDs`, you should have a look at [multiformats/js-cid](https://github.com/multiformats/js-cid). Moreover, you can find out more about peer routing on the example provided on [./CONFIGURATION.md#setup-with-content-and-peer-routing](./CONFIGURATION.md#setup-with-content-and-peer-routing).

### Pubsub

If you are looking for real time message exchange between peers, pubsub may be what you are looking for. Publish/Subscribe is a system where peers congregate around topics they are interested in. Peers interested in a topic are said to be subscribed to that topic and should receive the data published on it from other peers.

Looking at the [available pubsub routers](./CONFIGURATION.md#pubsub), you might choose `libp2p-gossipsub` first, and consider other options later on. You should revisit the [API](./API.md) document, more specifically [API#pubsub.getSubscribers](./API.md#pubsubgetsubscribers), [API#pubsub.getTopics](./API.md#pubsubgettopics), [API#pubsub.publish](./API.md#pubsubpublish) and [API#pubsub.subscribe](./API.md#pubsubsubscribe).

```sh
npm install libp2p-gossipsub
```

```js
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const GossipSub = require('libp2p-gossipsub')

const node = await Libp2p.create({
  modules: {
    transport: [TCP],
    streamMuxer: [MPLEX],
    connEncryption: [SECIO],
    pubsub: GossipSub
  },
  config: {
    pubsub: {                     // The pubsub options (and defaults) can be found in the pubsub router documentation
      enabled: true,
      emitSelf: true,             // whether the node should emit to self on publish
      signMessages: true,         // if messages should be signed
      strictSigning: true         // if message signing should be required
    }
  }
})

// start libp2p
await node.start()

const topic = 'heartbeat'

// log all heartbeat measures
node.pubsub.subscribe(topic, (msg) => {
  console.log(msg.data.toString())
})

setInterval(async () => {
  await node.pubsub.publish(topic, Buffer.from('heartbeat data'))
}, 1000)

```

## What is next

There are a lot of other concepts within `libp2p`, mostly regarding performance improvement through connection management configuration, metrics, create your own modules, among other.

We will not cover this in the **Getting Started** guide, but feel free to open issues if you need any help.
