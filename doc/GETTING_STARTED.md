# Getting Started

Welcome to libp2p, this guide will walk you through setting up a fully functional libp2p node 🚀

- [Getting Started](#getting-started)
  - [Install](#install)
  - [Configuring libp2p](#configuring-libp2p)
    - [Basic setup](#basic-setup)
      - [Transports](#transports)
      - [Connection Encryption](#connection-encryption)
      - [Multiplexing](#multiplexing)
      - [Running Libp2p](#running-libp2p)
    - [Custom setup](#custom-setup)
      - [Peer Discovery](#peer-discovery)
      - [Peer Routing](#peer-routing)
      - [Content Routing](#content-routing)
    - [Pubsub](#pubsub)
  - [What is next](#what-is-next)

## Install

The first step is to install libp2p in your project:

```sh
npm install libp2p
```

## Configuring libp2p

If you're new to libp2p, we recommend configuring your node in stages, as this can make troubleshooting configuration issues much easier. In this guide, we'll do just that. If you're more experienced with libp2p, you may wish to jump to the [Configuration readme](./CONFIGURATION.md).

### Basic setup

Now that we have libp2p installed, let's configure the absolute minimum needed to get your node running. The only modules libp2p requires are a [**Transport**][transport] and [**Crypto**][crypto] module. Moreover, we recommend that a basic setup should also have a [**Stream Multiplexer**](streamMuxer) configured. Let's start by setting up a Transport.

#### Transports

Libp2p uses Transports to establish connections between peers over the network. You can configure 1 Transport, or as many as you like. Supporting more Transports will improve the ability for other nodes on the network to communicate with you.

You should select Transports according to the runtime where your application will run. You can see a list of some of the available Transports in the [configuration readme](./CONFIGURATION.md#transport). We are going to install `libp2p-websockets`, as it can be used in both Node.js and the browser.

Start by installing `libp2p-websockets`:

```sh
npm install libp2p-websockets
```

Now that we have the module installed, let's configure libp2p to use the Transport. We'll use the [`Libp2p.create`](./API.md#create) method, which takes a single configuration object as its only parameter. We can add the Transport by passing it into the `modules.transport` array:

```js
const Libp2p = require('libp2p')
const WebSockets = require('libp2p-websockets')

const node = await Libp2p.create({
  modules: {
    transport: [WebSockets]
  }
})
```

As new Transports are created, you may wish to reevaluate your needs and select the latest Transports that best suit your requirements. You may wish to remove the Transports you had before, or simply append the new Transports to `modules.transport` in order to establish connections with peers that support either.

#### Connection Encryption

Encryption is an important part of communicating on the libp2p network. Every connection must be encrypted to help ensure security for everyone. As such, Connection Encryption (Crypto) is a required component of libp2p.

There are a growing number of Crypto modules being developed for libp2p. As those are released they will be tracked in the [available Connection Encryption](./CONFIGURATION.md#connection-encryption) section of the configuration readme. For now, we are going to configure our node to use the `libp2p-secio` module.

```sh
npm install libp2p-secio
```

With `libp2p-secio` installed, we can add it to our existing configuration by importing it and adding it to the `modules.connEncryption` array:

```js
const Libp2p = require('libp2p')
const WebSockets = require('libp2p-websockets')
const SECIO = require('libp2p-secio')

const node = await Libp2p.create({
  modules: {
    transport: [WebSockets],
    connEncryption: [SECIO]
  }
})
```

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

#### Running Libp2p

Now that you have configured a [`Transport`][transport], [`Crypto`][crypto] and [**Stream Multiplexer**](streamMuxer) module, you can start your libp2p node. We can start and stop libp2p using the [`libp2p.start()`](./API.md#start) and [`libp2p.stop()`](./API.md#stop) methods.

```js
const Libp2p = require('libp2p')
const WebSockets = require('libp2p-websockets')
const SECIO = require('libp2p-secio')
const MPLEX = require('libp2p-mplex')

const node = await Libp2p.create({
  modules: {
    transport: [WebSockets],
    connEncryption: [SECIO],
    streamMuxer: [MPLEX]
  }
})

// start libp2p
await node.start()

// stop libp2p
await node.stop()
```

If you are not familiar with multiaddrs, you should read the [multiformats/js-multiaddr](https://github.com/multiformats/js-multiaddr) README.

### Custom setup

After having your libp2p node running, it is time to configure all its features according to your project needs.

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


[transport]: https://github.com/libp2p/js-interfaces/tree/master/src/transport
[crypto]: https://github.com/libp2p/js-interfaces/tree/master/src/crypto
[streamMuxer]: https://github.com/libp2p/js-interfaces/tree/master/src/stream-muxer
