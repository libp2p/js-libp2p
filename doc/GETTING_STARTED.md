# Getting Started

Welcome to libp2p! This guide will walk you through setting up a fully functional libp2p node 🚀

- [Getting Started](#getting-started)
  - [Install](#install)
  - [Configuring libp2p](#configuring-libp2p)
    - [ESM](#esm)
    - [Basic setup](#basic-setup)
      - [Transports](#transports)
      - [Connection Encryption](#connection-encryption)
      - [Multiplexing](#multiplexing)
      - [Running Libp2p](#running-libp2p)
    - [Custom setup](#custom-setup)
      - [Peer Discovery](#peer-discovery)
  - [Debugging](#debugging)
    - [Node](#node)
    - [Browser](#browser)
  - [React Native](#react-native)
  - [What is next](#what-is-next)

## Install

The first step is to install libp2p in your project:

```sh
npm install libp2p
```

## Configuring libp2p

If you're new to libp2p, we recommend configuring your node in stages, as this can make troubleshooting configuration issues much easier. In this guide, we'll do just that. If you're more experienced with libp2p, you may wish to jump to the [Configuration readme](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md).

### ESM

Since `libp2p@0.37.0` modules are now [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

ESM is the module system for JavaScript, it allows us to structure our code in separate files without polluting a global namespace.

Other systems have tried to fill this gap, notably CommonJS, AMD, RequireJS and others, but ESM is [the official standard format](https://tc39.es/ecma262/#sec-modules) to package JavaScript code for reuse. This means that you need ensure your configuration uses the correct module system, if you are using Typescript, set the [`module` field in your tsconfig](https://www.typescriptlang.org/tsconfig#module) to `ES2022 ` or later e.g.

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "esModuleInterop": true,
    "target": "ES2022",
    "moduleResolution": "node"
  }
}
```

For more info on enabling ES modules in Node, see [this guide](https://nodejs.org/api/esm.html).

### Basic setup

Now that we have libp2p installed, let's configure the minimum needed to get your node running. The only modules libp2p requires are a [**Transport**][transport] and [**Crypto**][crypto] module. However, we recommend that a basic setup should also have a [**Stream Multiplexer**](streamMuxer) configured, which we will explain shortly. Let's start by setting up a Transport.

#### Transports

Libp2p uses Transports to establish connections between peers over the network. Transports are the components responsible for performing the actual exchange of data between libp2p nodes. You can configure any number of Transports, but you only need 1 to start with. Supporting more Transports will improve the ability of your node to speak to a larger number of nodes on the network, as matching Transports are required for two nodes to communicate with one another.

You should select Transports according to the runtime of your application; Node.js or the browser. You can see a list of some of the available Transports in the [configuration readme](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md#transport). For this guide let's install `@libp2p/websockets`, as it can be used in both Node.js and the browser.

Start by installing `@libp2p/websockets`:

```sh
npm install @libp2p/websockets
```

Now that we have the module installed, let's configure libp2p to use the Transport. We'll use the [`Libp2p.create`](https://github.com/libp2p/js-libp2p/blob/main/doc/API.md#create) method, which takes a single configuration object as its only parameter. We can add the Transport by passing it into the `modules.transport` array:

```js
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'

const node = await createLibp2p({
  transports: [webSockets()]
})
```

There are multiple libp2p transports available, you should evaluate the needs of your application and select the Transport(s) that best suit your requirements. You can add as many transports as you like to `modules.transport` in order to establish connections with as many peers as possible.

<details><summary>Read More</summary>
If you want to know more about libp2p transports, you should read the following content:

- https://docs.libp2p.io/concepts/transports
- https://github.com/libp2p/specs/tree/master/connections
</details>

#### Connection Encryption

Encryption is an important part of communicating on the libp2p network. Every connection must be encrypted to help ensure security for everyone. As such, Connection Encryption (Crypto) is a required component of libp2p.

There are a growing number of Crypto modules being developed for libp2p. As those are released they will be tracked in the [Connection Encryption section of the configuration readme](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md#connection-encryption). For now, we are going to configure our node to use the `@chainsafe/libp2p-noise` module.

```sh
npm install @chainsafe/libp2p-noise
```

With `@chainsafe/libp2p-noise` installed, we can add it to our existing configuration by importing it and adding it to the `modules.connEncryption` array:

```js
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'

const node = await createLibp2p({
  transports: [webSockets()],
  connectionEncrypters: [noise()]
})
```

<details><summary>Read More</summary>
If you want to know more about libp2p connection encryption, you should read the following content:

- https://docs.libp2p.io/concepts/secure-comms
- https://github.com/libp2p/specs/tree/master/connections
</details>

#### Multiplexing

While multiplexers are not strictly required, they are highly recommended as they improve the effectiveness and efficiency of connections for the various protocols libp2p runs. Adding a multiplexer to your configuration will allow libp2p to run several of its internal protocols, like Identify, as well as allow your application to easily run any number of protocols over a single connection.

Looking at the [available stream multiplexing](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md#stream-multiplexing) modules. Bear in mind that future libp2p Transports might have `multiplexing` capabilities already built-in (such as `QUIC`).

You can install `@chainsafe/libp2p-yamux` and add it to your libp2p node as follows in the next example.

```sh
npm install @chainsafe/libp2p-yamux
```

```ts
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'

const node = await createLibp2p({
  transports: [webSockets()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()]
})
```

<details><summary>Read More</summary>
If you want to know more about libp2p stream multiplexing, you should read the following content:

- https://docs.libp2p.io/concepts/stream-multiplexing
- https://github.com/libp2p/specs/tree/master/connections
- https://github.com/libp2p/specs/tree/master/yamux
</details>

#### Running Libp2p

Now that you have configured a [**Transport**][transport], [**Crypto**][crypto] and [**Stream Multiplexer**](streamMuxer) module, you can start your libp2p node. We can start and stop libp2p using the [`libp2p.start()`](https://github.com/libp2p/js-libp2p/blob/main/doc/API.md#start) and [`libp2p.stop()`](https://github.com/libp2p/js-libp2p/blob/main/doc/API.md#stop) methods.

```ts
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'

const node = await createLibp2p({
  // libp2p nodes are started by default, pass false to override this
  start: false,
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/8000/ws']
  },
  transports: [webSockets()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()]
})

// start libp2p
await node.start()
console.log('libp2p has started')

const listenAddresses = node.getMultiaddrs()
console.log('libp2p is listening on the following addresses: ', listenAddresses)

// stop libp2p
await node.stop()
console.log('libp2p has stopped')
```

### Custom setup

Once your libp2p node is running, it is time to get it connected to the public network. We can do this via peer discovery.

#### Peer Discovery

Peer discovery is an important part of creating a well connected libp2p node. A static list of peers will often be used to join the network, but it's useful to couple other discovery mechanisms to ensure you're able to discover other peers that are important to your application.

For each discovered peer libp2p will emit a `peer:discovery` event which includes metadata about that peer. You can read the [Events](https://github.com/libp2p/js-libp2p/tree/main/doc/API.md#events) in the API doc to learn more.

Looking at the [available peer discovery](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md#peer-discovery) protocols, there are several options to be considered:
- If you already know the addresses of some other network peers, you should consider using `@libp2p/bootstrap` as this is the easiest way of getting your peer into the network.
- If it is likely that you will have other peers on your local network, `@libp2p/mdns` is a must if you're node is not running in the browser. It allows peers to discover each other when on the same local network.
- A random walk approach can be used via `@libp2p/kad-dht`, to crawl the network and find new peers along the way.

For this guide we will configure `@libp2p/bootstrap` as this is useful for joining the public network.

Let's install `@libp2p/bootstrap`.

```sh
npm install @libp2p/bootstrap
```

We can provide specific configurations for each protocol within a `config.peerDiscovery` property in the options as shown below.

```ts
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'

// Known peers addresses
const bootstrapMultiaddrs = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
]

const node = await createLibp2p({
  transports: [webSockets()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  peerDiscovery: [
    bootstrap({
      list: bootstrapMultiaddrs, // provide array of multiaddrs
    })
  ]
})

node.addEventListener('peer:discovery', (evt) => {
  console.log('Discovered %s', evt.detail.id.toString()) // Log discovered peer
})

node.addEventListener('peer:connect', (evt) => {
  console.log('Connected to %s', evt.detail.toString()) // Log connected peer
})
```

<details><summary>Read More</summary>
If you want to know more about libp2p peer discovery, you should read the following content:

- https://github.com/libp2p/specs/blob/master/discovery/mdns.md
</details>

## Debugging

When running libp2p you may want to see what things are happening behind the scenes. You can see trace logs by setting the `DEBUG` environment variable when running in Node.js, and by setting `debug` as a localStorage item when running in the browser. Some examples:

### Node

```JavaScript
# all libp2p debug logs
DEBUG="libp2p:*" node my-script.js

# networking debug logs
DEBUG="libp2p:tcp,libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer" node my-script.js
```

### Browser

```JavaScript
// all libp2p debug logs
localStorage.setItem('debug', 'libp2p:*') // then refresh the page to ensure the libraries can read this when spinning up.

// networking debug logs
localStorage.setItem('debug', 'libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer')
```

## React Native

Libp2p can be used in React Native applications. However, there are some limitations and considerations to take into account as not all transports are supported and some of the underlying dependencies may not work as expected. There is on-going work to address these issues, particularly around the support of TCP. For a demo on how to use libp2p in a React Native application, see https://github.com/ipfs-shipyard/js-libp2p-react-native

## What is next

There are a lot of other concepts within `libp2p`, that are not covered in this guide. For additional configuration options we recommend checking out the [Configuration Readme](https://github.com/libp2p/js-libp2p/blob/main/doc/CONFIGURATION.md) and the [examples repo](https://github.com/libp2p/js-libp2p-examples). If you have any problems getting started, or if anything isn't clear, please let us know by submitting an issue!


[transport]: https://github.com/libp2p/js-libp2p/tree/main/packages/interface/src/transport
[crypto]: https://github.com/libp2p/js-libp2p/tree/main/packages/interface/src/crypto
[streamMuxer]: https://github.com/libp2p/js-libp2p/tree/main/packages/interface/src/stream-muxer
