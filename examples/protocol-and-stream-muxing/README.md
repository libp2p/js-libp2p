# Protocol and Stream Multiplexing (aka muxing)

One of the specialties of libp2p is solving the bane of protocol discovery and handshake between machines. Before libp2p, you would have to assign a listener to a port and then through some process of formal specification you would assign ports to special protocols so that other hosts would know before hand which port to dial (e.g ssh (22), http (80), https (443), ftp (21), etc). With libp2p you don't need to do that anymore, not only you don't have to assign ports before hand, you don't even need to think about ports at all since all the protocol handshaking happens in the wire!

The feature of agreeing on a protocol over an established connection is what we call _protocol multiplexing_ and it is possible through [multistream-select](https://github.com/multiformats/multistream), another protocol that lets you agree per connection (or stream) which protocol is going to be talked over that connection (select), it also enables you to request the other end to tell you which protocols it supports (ls). You can learn more about multistream-select at its [specification repo](https://github.com/multiformats/multistream).

# 1. Handle multiple protocols

Let's see _protocol multiplexing_ in action! You will need the following modules for this example: `libp2p`, `libp2p-tcp`, `peer-info`, `async` and `pull-stream`. This example reuses the base left by the [Transports](../transports) example. You can see the complete solution at [1.js](./1.js).

After creating the nodes, we need to tell libp2p which protocols to handle. 

```JavaScript
// ...
const node1 = nodes[0]
const node2 = nodes[1]

// Here we are telling libp2p that is someone dials this node to talk with the `/your-protocol`
// multicodec, the protocol identifier, please call this callback and give it the connection
// so that incomming data can be handled
node2.handle('/your-protocol', (protocol, conn) => {
  pull(
    conn,
    pull.map((v) => v.toString()),
    pull.log()
  )
})
```

After the protocol is _handled_, now we can dial to it.

```JavaScript
node1.dial(node2.peerInfo, '/your-protocol', (err, conn) => {
  if (err) { throw err }
  pull(pull.values(['my own protocol, wow!']), conn)
})
```

You might have seen this in the [Transports](../transports) examples. However, what it was not explained is that you can do more than exact string matching, for example, you can use semver.

```JavaScript
node2.handle('/another-protocol/1.0.1', (protocol, conn) => {
  pull(
    conn,
    pull.map((v) => v.toString()),
    pull.log()
  )
})
// ...
node1.dial(node2.peerInfo, '/another-protocol/1.0.0', (err, conn) => {
  if (err) { throw err }
  pull(pull.values(['semver me please']), conn)
})
```

This feature is super power for network protocols. It works in the same way as versioning your RPC/REST API, but for anything that goes in the wire. We had to use this feature to upgrade protocols within the IPFS Stack (i.e Bitswap) and we successfully managed to do so without any network splits.

There is still one last feature, you can create your custom match functions. 

```JavaScript
node2.handle('/custom-match-func', (protocol, conn) => {
  pull(
    conn,
    pull.map((v) => v.toString()),
    pull.log()
  )
}, (myProtocol, requestedProtocol, callback) => {
  // This is all custom. I'm checking the base path matches, think of this
  // as a HTTP routing table.
  if (myProtocol.indexOf(requestedProtocol)) {
    callback(null, true)
  } else {
    callback(null, false)
  }
})
// ...
node1.dial(node2.peerInfo, '/custom-match-func/some-query', (err, conn) => {
  if (err) { throw err }
  pull(pull.values(['do I fall into your criteria?']), conn)
})
```

Try all of this out by executing [1.js](./1.js).

# 2. Reuse existing connection

The example above would require a node to create a whole new connection for every time it dials in one of the protocols, this is a waste of resources and also it might be simply not possible (e.g lack of file descriptors, not enough ports being open, etc). What we really want is to dial a connection once and then multiplex several virtual connections (stream) over a single connection, this is where _stream multiplexing_ comes into play.

Stream multiplexing is a old concept, in fact it happens in many of the layers of the [OSI System](https://en.wikipedia.org/wiki/OSI_model), in libp2p we make this feature to our avail by letting the user pick which module for stream multiplexing to use.

Currently, we have two available [libp2p-spdy](https://github.com/libp2p/js-libp2p-spdy) and [libp2p-multiplex](https://github.com/libp2p/js-libp2p-multiplex) and pluging them in is as easy as adding another transport. Let's revisit our libp2p bundle.

```JavaScript
const SPDY = require('libp2p-spdy')
//...
class MyBundle extends libp2p {
  constructor (peerInfo) {
    const modules = {
      transport: [new TCP()],
      // Here we are adding the SPDY muxer to our libp2p bundle.
      // Thanks to protocol muxing, a libp2p bundle can support multiple Stream Muxers at the same
      // time and pick the right one when dialing to a node
      connection: {
        muxer: [SPDY]
      }
    }
    super(modules, peerInfo)
  }
}
```

With this, we can dial as many times as we want to a peer and always reuse the same established underlying connection.

```JavaScript
node2.handle('/a', (protocol, conn) => {
  pull(
    conn,
    pull.map((v) => v.toString()),
    pull.log()
  )
})

node2.handle('/b', (protocol, conn) => {
  pull(
    conn,
    pull.map((v) => v.toString()),
    pull.log()
  )
})

series([
  (cb) => node1.dial(node2.peerInfo, '/a', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['protocol (a)']), conn)
    cb()
  }),
  (cb) => node1.dial(node2.peerInfo, '/b', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['protocol (b)']), conn)
    cb()
  }),
  (cb) => node1.dial(node2.peerInfo, '/b', (err, conn) => {
    if (err) { throw err }
    pull(pull.values(['another conn on protocol (b)']), conn)
    cb()
  })
])
```

By running [2.js](./2.js) you should see the following result:

```
> node 2.js
protocol (a)
protocol (b)
another protocol (b)
```

# 3. Bidirectional connections

There is one last trick on _protocol and stream multiplexing_ that libp2p uses to make everyone's life easier and that is _biderectional connection_.

With the aid of both mechanisms, we can reuse an incomming connection to dial streams out too, this is specially useful when you are behind tricky NAT, firewalls or if you are running in a browser, where you can have listening addrs, but you can dial out. By dialing out, you enable other peers to talk with you in Protocols that they want, simply by opening a new multiplexed stream.

You can see this working on example [3.js](./3.js). The result should look like the following:

```Bash
> node 3.js
from 1 to 2
Addresses by which both peers are connected
node 1 to node 2: /ip4/127.0.0.1/tcp/50629/ipfs/QmZwMKTo6wG4Te9A6M2eJnWDpR8uhsGed4YRegnV5DcKiv
node 2 to node 1: /ip4/127.0.0.1/tcp/50630/ipfs/QmRgormJQeDyXhDKma11eUtksoh8vWmeBoxghVt4meauW9
from 2 to 1
```
