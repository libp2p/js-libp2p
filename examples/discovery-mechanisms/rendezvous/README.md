# Rendezvous

During the lifetime of a libp2p node, particularly during its startup, establishing connections with other peers will be crucial to create a network topology able to fulfill the needs of the node.

Each connection to a different peer might have different outcomes. Accordingly, each peer will need to find peers providing a given service or playing a given role over time, so that they can operate more efficiently. These services and roles can range from circuit relays to enable connectivity between restricted nodes, subscribers of a given pubsub topic, or even application specific routing.

One of the possible ways to register and discover certain roles/services is using the [rendezvous protocol](https://github.com/libp2p/specs/tree/master/rendezvous). For using it, the network needs to have well known libp2p nodes acting as rendezvous servers. They will collect and maintain a list of registrations per rendezvous namespace. Other peers in the network will act as rendezvous clients and will register themselves on given namespaces by messaging a rendezvous server node. Taking into account these registrations, a rendezvous client is also able to discover other peers in a given namespace by querying a server. Each registration has a time to live, in order to avoid finding invalid registrations.

## 0. Set up the example

Before moving into the examples, you should run `npm install` on the top level `js-libp2p` folder, in order to install all the dependencies needed for this example. Once the install finishes, you should move into the example folder with `cd examples/discovery-mechanisms/rendezvous`.

You will also need to install and run a `libp2p-rendezvous` server. In the context of this example, we can just install `libp2p-rendezvous` globally and run a server locally with:

```sh
npm i -g libp2p-rendezvous
libp2p-rendezvous-server --enableMemoryDatabase
```

We will be using a memory database for demonstration purposes. For using this in production you should read [libp2p/js-libp2p-rendezvous instructions](https://github.com/libp2p/js-libp2p-rendezvous) and use a database to back it up.

It should print out the addresses the server is listening on as:

```sh
Rendezvous server listening on:
/ip4/127.0.0.1/tcp/15003/ws/p2p/QmeSKXKKfkQzE45WTLY7Me1RaC8ZhG9aFfSPVEnGHbFQXM
/ip4/127.0.0.1/tcp/8000/p2p/QmeSKXKKfkQzE45WTLY7Me1RaC8ZhG9aFfSPVEnGHbFQXM
```

## 1. Set up a listener node providing a service

One of the typical use cases for Rendezvous is to easily make discoverable nodes that provide services to boost the network. These libp2p nodes should make themselves discoverable by using rendezvous namespaces.

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('libp2p-noise')
const MPLEX = require('libp2p-mplex')

const multiaddr = require('multiaddr')

const rendezvousServerAddr = process.argv[2]
if (!rendezvousServerAddr) {
  throw new Error('the relay address needs to be specified as a parameter')
}

const rendezvousServerMultiaddr = multiaddr(rendezvousServerAddr)

const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    connEncryption: [NOISE],
    streamMuxer: [MPLEX]
  },
  addresses: {
    listen: ['/ip4/127.0.0.1/tcp/0/ws']
  },
  rendezvous: {
    enabled: true,
    rendezvousPoints: [rendezvousServerMultiaddr]
  }
})

await node.start()
console.log(`Node started with id ${node.peerId.toB58String()}`)
console.log('Node listening on:')
node.multiaddrs.forEach((m) => console.log(`${m}/p2p/${node.peerId.toB58String()}`))

await node.rendezvous.register('example-namespace')
console.log('Registered to: ', ns)
```

As you can see in the code, we need to provide the rendezvous server address, `rendezvousServerAddr`, as a process argument.

You should now run the following to start the node providing the service:

```sh
node listener.js /ip4/127.0.0.1/tcp/15003/ws/p2p/QmeSKXKKfkQzE45WTLY7Me1RaC8ZhG9aFfSPVEnGHbFQXM
```

This should print out something similar to the following:

```sh
Node started with id QmV4sitaJ5ZC2Vpgza8NyjeTSWV4FvHd5cNmyPPPKpoRE7
Node listening on:
/ip4/127.0.0.1/tcp/50347/ws/p2p/QmV4sitaJ5ZC2Vpgza8NyjeTSWV4FvHd5cNmyPPPKpoRE7
Registered to: example-namespace
```

## 2. Set up a Dialer node discovering the service

Now that you have a node providing a given service, you can discover it via the rendezvous server.

```js
const rendezvousServerAddr = process.argv[2]
  if (!rendezvousServerAddr) {
    throw new Error('the rendezvous server address needs to be specified as a parameter')
  }

  const rendezvousServerMultiaddr = multiaddr(rendezvousServerAddr)
  const ns = 'example-namespace'

  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    rendezvous: {
      enabled: true,
      rendezvousPoints: [rendezvousServerMultiaddr]
    }
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toB58String()}`)

  for await (const reg of node.rendezvous.discover(ns)) {
    const e = await Envelope.openAndCertify(reg.signedPeerRecord, PeerRecord.DOMAIN)
    const rec = PeerRecord.createFromProtobuf(e.payload)

    console.log(`Discovered peer with id: ${rec.peerId.toB58String()} and multiaddrs ${rec.multiaddrs}`)
  }
```

You should now run the following to start the node discovering the service:

```sh
node dialer.js /ip4/127.0.0.1/tcp/15003/ws/p2p/QmeSKXKKfkQzE45WTLY7Me1RaC8ZhG9aFfSPVEnGHbFQXM
```

This should print out something similar to the following:

```sh
Node started with id QmanTJphnwpKTeRaoDpEiMoNytvKyFUh61Ri9ifptbvJdb
Discovered peer with id: QmV4sitaJ5ZC2Vpgza8NyjeTSWV4FvHd5cNmyPPPKpoRE7 and multiaddrs /ip4/127.0.0.1/tcp/50347/ws
```

As you can see, the dialer discovered the node providing the `example-namespace` service and can now use its multiaddr and id to dial it.

## 3. What's next?

Libp2p does not support re-registering over time. This means that the application layer will need to handle triggering the `rendezvous.register` over time to refresh the registration of the node in the given rendezvous servers. The minimum ttl of a registration is 2 hours.
