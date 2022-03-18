# [Transports](http://libp2p.io/implementations/#transports)

libp2p doesn't make assumptions for you, instead, it enables you as the developer of the application to pick the modules you need to run your application, which can vary depending on the runtime you are executing. A libp2p node can use one or more Transports to dial and listen for Connections. These transports are modules that offer a clean interface for dialing and listening, defined by the [interface-transport] specification. Some examples of possible transports are: TCP, UTP, WebRTC, QUIC, HTTP, Pigeon and so on.

A more complete definition of what is a transport can be found on the [interface-transport] specification. A way to recognize a candidate transport is through the badge:

![][interface-transport badge]

## 1. Creating a libp2p node with TCP

When using libp2p, you need properly configure it, that is, pick your set of modules and create your network stack with the properties you need. In this example, we will create a libp2p node TCP. You can find the complete solution on the file [1.js](./1.js).

You will need 4 dependencies total, so go ahead and install all of them with:

```bash
> npm install libp2p libp2p-tcp @chainsafe/libp2p-noise
```

Then, in your favorite text editor create a file with the `.js` extension. I've called mine `1.js`.

First thing is to create our own libp2p node! Insert:

```JavaScript
import { createLibp2p } from 'libp2p'
import { TCP } from '@libp2p/tcp'
import { Noise } from '@chainsafe/libp2p-noise'

const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transport: [
      new TCP()
    ],
    connectionEncrypters: [
      new Noise()
    ]
  })

  await node.start()
  return node
}
```

Now that we have a function to create our own libp2p node, let's create a node with it.

```JavaScript
const node = await createNode()

// At this point the node has started
console.log('node has started (true/false):', node.isStarted())
// And we can print the now listening addresses.
// If you are familiar with TCP, you might have noticed
// that we specified the node to listen in 0.0.0.0 and port
// 0, which means "listen in any network interface and pick
// a port for me
console.log('listening on:')
node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
```

Running this should result in something like:

```bash
> node 1.js
node has started (true/false): true
listening on:
/ip4/127.0.0.1/tcp/61329/p2p/QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ
/ip4/192.168.2.156/tcp/61329/p2p/QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ
```

That `QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ` is the PeerId that was created during the PeerInfo generation.

## 2. Dialing from one node to another node

Now that we have our `createNode` function, let's create two nodes and make them dial to each other! You can find the complete solution at [2.js](./2.js).

For this step, we will need some more dependencies.

```bash
> npm install it-pipe it-concat libp2p-mplex
```

And we also need to import the modules on our .js file:

```js
import { pipe } from 'it-pipe'
const concat from 'it-concat')
import { Mplex } from '@libp2p/mplex'
```

We are going to reuse the `createNode` function from step 1, but this time add a stream multiplexer from `libp2p-mplex`.
```js
const createNode = async () => {
  const node = await createLibp2p({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    transports: [new TCP()],
    connectionEncrypters: [new Noise()],
    streamMuxers: [new Mplex()] // <--- Add this line
  })

  await node.start()
  return node
}
```
We will also make things simpler by creating another function to print the multiaddresses to avoid duplicating code.

```JavaScript
function printAddrs (node, number) {
  console.log('node %s is listening on:', number)
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}
```

Then add,

```js
;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  printAddrs(node1, '1')
  printAddrs(node2, '2')

  node2.handle('/print', async ({ stream }) => {
    const result = await pipe(
      stream,
      concat
    )
    console.log(result.toString())
  })

  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  const { stream } = await node1.dialProtocol(node2.peerId, '/print')

  await pipe(
    ['Hello', ' ', 'p2p', ' ', 'world', '!'],
    stream
  )
})();
```
For more information refer to the [docs](https://github.com/libp2p/js-libp2p/blob/master/doc/API.md).

The result should look like:

```bash
> node 2.js
node 1 is listening on:
/ip4/127.0.0.1/tcp/62279/p2p/QmeM4wNWv1uci7UJjUXZYfvcy9uqAbw7G9icuxdqy88Mj9
/ip4/192.168.2.156/tcp/62279/p2p/QmeM4wNWv1uci7UJjUXZYfvcy9uqAbw7G9icuxdqy88Mj9
node 2 is listening on:
/ip4/127.0.0.1/tcp/62278/p2p/QmWp58xJgzbouNJcyiNNTpZuqQCJU8jf6ixc7TZT9xEZhV
/ip4/192.168.2.156/tcp/62278/p2p/QmWp58xJgzbouNJcyiNNTpZuqQCJU8jf6ixc7TZT9xEZhV
Hello p2p world!
```

## 3. Using multiple transports

Next, we want nodes to have multiple transports available to increase their chances of having a common transport in the network to communicate over. A simple scenario is a node running in the browser only having access to HTTP, WebSockets and WebRTC since the browser doesn't let you open any other kind of transport. For this node to dial to some other node, that other node needs to share a common transport.

What we are going to do in this step is to create 3 nodes: one with TCP, another with TCP+WebSockets and another one with just WebSockets. The full solution can be found on [3.js](./3.js).

In this example, we will need to also install `libp2p-websockets`:

```bash
> npm install libp2p-websockets
```

We want to create 3 nodes: one with TCP, one with TCP+WebSockets and one with just WebSockets. We need to update our `createNode` function to accept WebSocket connections as well. Moreover, let's upgrade our function to enable us to pick the addresses over which a node will start a listener:

```JavaScript
// ...

const createNode = async (transports, addresses = []) => {
  if (!Array.isArray(addresses)) {
    addresses = [addresses]
  }

  const node = await createLibp2p({
    addresses: {
      listen: addresses
    },
    transport: transports,
    connectionEncrypters: [new Noise()],
    streamMuxers: [new Mplex()]
  })

  await node.start()
  return node
}
```

As a rule, a libp2p node will only be capable of using a transport if: a) it has the module for it and b) it was given a multiaddr to listen on. The only exception to this rule is WebSockets in the browser, where a node can dial out, but unfortunately cannot open a socket.

Let's update our flow to create nodes and see how they behave when dialing to each other:

```JavaScript
import { WebSockets } from '@libp2p/websockets'
import { TCP } from '@libp2p/tcp'

const [node1, node2, node3] = await Promise.all([
  createNode([TCP], '/ip4/0.0.0.0/tcp/0'),
  createNode([TCP, WebSockets], ['/ip4/0.0.0.0/tcp/0', '/ip4/127.0.0.1/tcp/10000/ws']),
  createNode([WebSockets], '/ip4/127.0.0.1/tcp/20000/ws')
])

printAddrs(node1, '1')
printAddrs(node2, '2')
printAddrs(node3, '3')

node1.handle('/print', print)
node2.handle('/print', print)
node3.handle('/print', print)

await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
await node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)
await node3.peerStore.addressBook.set(node1.peerId, node1.multiaddrs)

// node 1 (TCP) dials to node 2 (TCP+WebSockets)
const { stream } = await node1.dialProtocol(node2.peerId, '/print')
await pipe(
  ['node 1 dialed to node 2 successfully'],
  stream
)

// node 2 (TCP+WebSockets) dials to node 2 (WebSockets)
const { stream: stream2 } = await node2.dialProtocol(node3.peerId, '/print')
await pipe(
  ['node 2 dialed to node 3 successfully'],
  stream2
)

// node 3 (WebSockets) attempts to dial to node 1 (TCP)
try {
  await node3.dialProtocol(node1.peerId, '/print')
} catch (err) {
  console.log('node 3 failed to dial to node 1 with:', err.message)
}
```

`print` is a function that prints each piece of data from a stream onto a new line but factored into its own function to save lines:

```JavaScript
function print ({ stream }) {
  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    }
  )
}
```

If everything was set correctly, you now should see something similar to the following after running the script:

```Bash
> node 3.js
node 1 is listening on:
/ip4/127.0.0.1/tcp/62620/p2p/QmWpWmcVJkF6EpmAaVDauku8g1uFGuxPsGP35XZp9GYEqs
/ip4/192.168.2.156/tcp/62620/p2p/QmWpWmcVJkF6EpmAaVDauku8g1uFGuxPsGP35XZp9GYEqs
node 2 is listening on:
/ip4/127.0.0.1/tcp/10000/ws/p2p/QmWAQtWdzWXibgfyc7WRHhhv6MdqVKzXvyfSTnN2aAvixX
/ip4/127.0.0.1/tcp/62619/p2p/QmWAQtWdzWXibgfyc7WRHhhv6MdqVKzXvyfSTnN2aAvixX
/ip4/192.168.2.156/tcp/62619/p2p/QmWAQtWdzWXibgfyc7WRHhhv6MdqVKzXvyfSTnN2aAvixX
node 3 is listening on:
/ip4/127.0.0.1/tcp/20000/ws/p2p/QmVq1PWh3VSDYdFqYMtqp4YQyXcrH27N7968tGdM1VQPj1
node 1 dialed to node 2 successfully
node 2 dialed to node 3 successfully
node 3 failed to dial to node 1 with:
    Error: No transport available for address /ip4/127.0.0.1/tcp/51482
```

As expected, we created 3 nodes: node 1 with TCP, node 2 with TCP+WebSockets and node 3 with just WebSockets. node 1 -> node 2 and node 2 -> node 3 managed to dial correctly because they shared a common transport; however, node 3 -> node 1 failed because they didn't share any.

## 4. How to create a new libp2p transport

Today there are already several transports available and plenty to come. You can find these at [interface-transport implementations] list.

Adding more transports is done through the same way as you added TCP and WebSockets. Some transports might offer extra functionalities, but as far as libp2p is concerned, if it follows the interface defined in the [spec][interface-transport api] it will be able to use it.

If you decide to implement a transport yourself, please consider adding to the list so that others can use it as well.

Hope this tutorial was useful. We are always looking to improve it, so contributions are welcome!

[interface-transport]: https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport
[interface-transport badge]: https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/packages/libp2p-interfaces/src/transport/img/badge.png
[interface-transport implementations]: https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport#modules-that-implement-the-interface
[interface-transport api]: https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport#api
