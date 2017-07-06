# [Transports](http://libp2p.io/implementations/#transports)

libp2p doesn't make assumptions for you, instead, it enables you as the developer of the application to pick the modules you need to run your application, which can vary depending on the runtime you are executing. A libp2p node can use one or more Transports to dial and listen for Connections. These transports are modules that offer a clean interface for dialing and listening, defined by the [interface-transport](https://github.com/libp2p/interface-transport) specification. Some examples of possible transports are: TCP, UTP, WebRTC, QUIC, HTTP, Pigeon and so on.

A more complete definition of what is a transport can be found on the [interface-transport](https://github.com/libp2p/interface-transport) specification. A way to recognize a candidate transport is through the badge:

[![](https://raw.githubusercontent.com/diasdavid/interface-transport/master/img/badge.png)](https://raw.githubusercontent.com/diasdavid/interface-transport/master/img/badge.png)

## 1. Creating a libp2p Bundle with TCP

When using libp2p, you always want to create your own libp2p Bundle, that is, pick your set of modules and create your network stack with the properties you need. In this example, we will create a bundle with TCP. You can find the complete solution on the file [1.js](/1.js).

You will need 4 deps total, so go ahead and install all of them with: 

```
> npm install libp2p libp2p-tcp peer-info async
```

Then, on your favorite text editor create a file with the `.js` extension. I've called mine `1.js`.

First thing is to create our own bundle! Insert:

```JavaScript
'use strict'

const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')

// This MyBundle class is your libp2p bundle packed with TCP
class MyBundle extends libp2p {
  constructor (peerInfo) {
    // modules is a JS object that will describe the components
    // we want for our libp2p bundle
    const modules = {
      transport: [new TCP()]
    }
    super(modules, peerInfo)
  }
}
```

Now that we have our own MyBundle class that extends libp2p, let's create a node with it. We will use `async/waterfall` just for code structure, but you don't need to. Append to the same file:

```JavaScript
let node

waterfall([
  // First we create a PeerInfo object, which will pack the
  // info about our peer. Creating a PeerInfo is an async
  // operation because we use the WebCrypto API
  // (yeei Universal JS)
  (cb) => PeerInfo.create(cb),
  (peerInfo, cb) => {
    // To signall the addresses we want to be available, we use
    // the multiaddr format, a self describable address
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    // Now we can create a node with that PeerInfo object
    node = new MyBundle(peerInfo)
    // Last, we start the node!
    node.start(cb)
  }
], (err) => {
  if (err) { throw err }

  // At this point the node has started
  console.log('node has started (true/false):', node.isOn())
  // And we can print the now listening addresses.
  // If you are familiar with TCP, you might have noticed
  // that we specified the node to listen in 0.0.0.0 and port
  // 0, which means "listen in any network interface and pick
  // a port for me
  console.log('listening on:')
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
})
```

Running this should result in somehting like:

```bash
> node 1.js
node has started (true/false): true
listening on:
/ip4/127.0.0.1/tcp/61329/ipfs/QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ
/ip4/192.168.2.156/tcp/61329/ipfs/QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ
```

That `QmW2cKTakTYqbQkUzBTEGXgWYFj1YEPeUndE1YWs6CBzDQ` is the PeerId that was created during the PeerInfo generation.

## 2. Dialing from one node to another node

Now that we have our bundle, let's create two nodes and make them dial to each other! You can find the complete solution at [2.js](/2.js).



## 3. Using multiple transports

- show TCP + websockets

## 4. How to create a new libp2p transport

- interface-transport
- follow the interface
- show other examples (webrtc, utp, udt (wip), etc)
- 
