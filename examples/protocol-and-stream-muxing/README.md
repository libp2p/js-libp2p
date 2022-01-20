# Protocol and Stream Multiplexing (aka muxing)

One of the specialties of libp2p is solving the bane of protocol discovery and handshake between machines. Before libp2p, you would have to assign a listener to a port and then through some process of formal specification you would assign ports to special protocols so that other hosts would know before hand which port to dial (e.g ssh (22), http (80), https (443), ftp (21), etc). With libp2p you don't need to do that anymore, not only you don't have to assign ports before hand, you don't even need to think about ports at all since all the protocol handshaking happens in the wire!

The feature of agreeing on a protocol over an established connection is what we call _protocol multiplexing_ and it is possible through [multistream-select](https://github.com/multiformats/multistream), another protocol that lets you agree per connection (or stream) which protocol is going to be talked over that connection (select), it also enables you to request the other end to tell you which protocols it supports (ls). You can learn more about multistream-select at its [specification repo](https://github.com/multiformats/multistream).

# 1. Handle multiple protocols

Let's see _protocol multiplexing_ in action! You will need the following modules for this example: `libp2p`, `libp2p-tcp`, `peer-id`, `it-pipe`, `it-buffer` and `streaming-iterables`. This example reuses the base left by the [Transports](../transports) example. You can see the complete solution at [1.js](./1.js).

After creating the nodes, we need to tell libp2p which protocols to handle.

```JavaScript
const pipe = require('it-pipe')
const { map } = require('streaming-iterables')
const { toBuffer } = require('it-buffer')

// ...
const node1 = nodes[0]
const node2 = nodes[1]

// Add node's 2 data to the PeerStore
await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)

// Here we are telling libp2p that if someone dials this node to talk with the `/your-protocol`
// multicodec, the protocol identifier, please call this handler and give it the stream
// so that incomming data can be handled
node2.handle('/your-protocol', ({ stream }) => {
  pipe(
    stream,
    source => (async function () {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    })()
  )
})
```

After the protocol is _handled_, now we can dial to it.

```JavaScript
const { stream } = await node1.dialProtocol(node2.peerId, ['/your-protocol'])

await pipe(
  ['my own protocol, wow!'],
  stream
)
```

You might have seen this in the [Transports](../transports) examples. However, what it was not explained is that you can do more than exact string matching, for example, you can use semver.

```JavaScript
node2.handle('/another-protocol/1.0.1', ({ stream }) => {
  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    }
  )
})
// ...
const { stream } = await node1.dialProtocol(node2.peerId, ['/another-protocol/1.0.0'])

await pipe(
  ['my own protocol, wow!'],
  stream
)
```

This feature is super power for network protocols. It works in the same way as versioning your RPC/REST API, but for anything that goes in the wire. We had to use this feature to upgrade protocols within the IPFS Stack (i.e Bitswap) and we successfully managed to do so without any network splits.

There is still one last feature, you can provide multiple protocols for the same handler. If you have a backwards incompatible change, but it only requires minor changes to the code, you may prefer to do protocol checking instead of having multiple handlers

```JavaScript
node2.handle(['/another-protocol/1.0.0', '/another-protocol/2.0.0'], ({ protocol, stream }) => {
  if (protocol === '/another-protocol/2.0.0') {
    // handle backwards compatibility
  }

  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(msg.toString())
      }
    }
  )
})
```

Try all of this out by executing [1.js](./1.js).

# 2. Reuse existing connection

The examples above would require a node to create a whole new connection for every time it dials in one of the protocols, this is a waste of resources and also it might be simply not possible (e.g lack of file descriptors, not enough ports being open, etc). What we really want is to dial a connection once and then multiplex several virtual connections (stream) over a single connection, this is where _stream multiplexing_ comes into play.

Stream multiplexing is an old concept, in fact it happens in many of the layers of the [OSI System](https://en.wikipedia.org/wiki/OSI_model). In libp2p, we make this feature to our avail by letting the user pick which module for stream multiplexing to use.

Currently, we have [libp2p-mplex](https://github.com/libp2p/js-libp2p-mplex) and pluging it in is as easy as adding a transport. Let's revisit our libp2p configuration.

```JavaScript
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
//...

const createNode = () => {
  return Libp2p.create({
    modules: {
      transport: [ TCP ],
      streamMuxer: [ Mplex ]
    }
  })
}
```

With this, we can dial as many times as we want to a peer and always reuse the same established underlying connection.

```JavaScript
node2.handle(['/a', '/b'], ({ protocol, stream }) => {
  pipe(
    stream,
    async function (source) {
      for await (const msg of source) {
        console.log(`from: ${protocol}, msg: ${msg.toString()}`)
      }
    }
  )
})

const { stream } = await node1.dialProtocol(node2.peerId, ['/a'])
await pipe(
  ['protocol (a)'],
  stream
)

const { stream: stream2 } = await node1.dialProtocol(node2.peerId, ['/b'])
await pipe(
  ['protocol (b)'],
  stream2
)

const { stream: stream3 } = await node1.dialProtocol(node2.peerId, ['/b'])
await pipe(
  ['another stream on protocol (b)'],
  stream3
)
```

By running [2.js](./2.js) you should see the following result:

```
> node 2.js
from: /a, msg: protocol (a)
from: /b, msg: protocol (b)
from: /b, msg: another stream on protocol (b)
```

# 3. Bidirectional connections

There is one last trick on _protocol and stream multiplexing_ that libp2p uses to make everyone's life easier and that is _bidirectional connection_.

With the aid of both mechanisms, we can reuse an incomming connection to dial streams out too, this is specially useful when you are behind tricky NAT, firewalls or if you are running in a browser, where you can't have listening addrs, but you can dial out. By dialing out, you enable other peers to talk with you in Protocols that they want, simply by opening a new multiplexed stream.

You can see this working on example [3.js](./3.js). The result should look like the following:

```Bash
> node 3.js
from 1 to 2
from 2 to 1
```
