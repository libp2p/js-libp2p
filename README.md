js-libp2p
=========

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io) [[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs) ![Build Status](https://travis-ci.org/diasdavid/js-libp2p.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-libp2p) ![](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square) [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript implementation of libp2p

![](https://raw.githubusercontent.com/diasdavid/specs/libp2p-spec/protocol/network/figs/logo.png)

# Description

libp2p is a networking stack and library modularized out of The IPFS Project, and bundled separately for other tools to use.

libp2p is the product of a long, and arduous quest of understanding -- a deep dive into the internet's network stack, and plentiful peer-to-peer protocols from the past. Building large scale peer-to-peer systems has been complex and difficult in the last 15 years, and libp2p is a way to fix that. It is a "network stack" -- a protocol suite -- that cleanly separates concerns, and enables sophisticated applications to only use the protocols they absolutely need, without giving up interoperability and upgradeability. libp2p grew out of IPFS, but it is built so that lots of people can use it, for lots of different projects.

We will be writing a set of docs, posts, tutorials, and talks to explain what p2p is, why it is tremendously useful, and how it can help your existing and new projects.

# Contribute

libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

 - Go through the modules below and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrasture behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

# Usage

`js-libp2p` repo will be a place holder for the list of JavaScript modules that compose js-libp2p, as well as its entry point

# Modules

- [libp2p](https://github.com/diasdavid/js-libp2p) (entry point)
- **Swarm**
  - [libp2p-swarm](https://github.com/diasdavid/js-libp2p-swarm)
  - [libp2p-identify](https://github.com/diasdavid/js-libp2p-swarm/tree/master/src/identify)
  - [libp2p-ping](https://github.com/diasdavid/js-libp2p-ping)
  - Transports
    - [abstract-transport](https://github.com/diasdavid/abstract-transport)
    - [abstract-connection](https://github.com/diasdavid/abstract-connection)
    - [libp2p-tcp](https://github.com/diasdavid/js-libp2p-tcp)
    - [libp2p-udp](https://github.com/diasdavid/js-libp2p-udp)
    - [libp2p-udt](https://github.com/diasdavid/js-libp2p-udt)
    - [libp2p-utp](https://github.com/diasdavid/js-libp2p-utp)
    - [libp2p-webrtc]()
    - [libp2p-cjdns]()
  - Stream Muxing
    - [abstract-stream-muxer](https://github.com/diasdavid/abstract-stream-muxer)
    - [libp2p-spdy](https://github.com/diasdavid/js-libp2p-spdy)
    - [libp2p-multiplex]()
  - Crypto Channel
    - [libp2p-tls]()
    - [libp2p-secio]()
- **Peer Routing**
  - [libp2p-kad-routing](https://github.com/diasdavid/js-libp2p-kad-routing)
  - [libp2p-mDNS-routing]()
- **Discovery**
  - [libp2p-mdns-discovery](https://github.com/diasdavid/js-libp2p-mdns-discovery)
  - [libp2p-random-walk](https://github.com/diasdavid/js-libp2p-random-walk)
  - [libp2p-railing](https://github.com/diasdavid/js-libp2p-railing)
- **Distributed Record Store**
  - [libp2p-record](https://github.com/diasdavid/js-libp2p-record)
  - [abstract-record-store](https://github.com/diasdavid/abstract-record-store)
  - [libp2p-distributed-record-store](https://github.com/diasdavid/js-libp2p-distributed-record-store)
  - [libp2p-kad-record-store](https://github.com/diasdavid/js-libp2p-kad-record-store)
- **Generic**
  - [PeerInfo](https://github.com/diasdavid/js-peer-info)
  - [PeerId](https://github.com/diasdavid/js-peer-id)
  - [multihash](https://github.com/jbenet/js-multihash)
  - [multihashing](https://github.com/jbenet/js-multihashing)
  - [multiaddr](https://github.com/jbenet/js-multiaddr)
  - [multistream](https://github.com/diasdavid/js-multistream)
  - [multicodec]()
  - [ipld](https://github.com/diasdavid/js-ipld)
  - [repo](https://github.com/ipfs/js-ipfs-repo)
  - [webcrypto](https://github.com/diasdavid/webcrypto)
- [**Specs**](https://github.com/ipfs/specs/tree/master/protocol/network)
- [**Website**](https://github.com/diasdavid/libp2p-website)

# Usage

## Interface

> **This is a work in progress, interface might change at anytime**

libp2p expects a [Record Store interface](https://github.com/diasdavid/abstract-record-store), a swarm and one or more Peer Routers that implement the [Peer Routing](https://github.com/diasdavid/abstract-peer-routing), the goal is to keep simplicity and plugability while the remaining modules execute the heavy lifting.

libp2p becomes very simple and basically acts as a glue for every module that compose this library. Since it can be highly customized, it requires some setup. What we recommend is to have a libp2p build for the system you are developing taking into account in your needs (e.g. for a browser working version of libp2p that acts as the network layer of IPFS, we have a built and minified version that browsers can require)

### Setting everything up

```
var Libp2p = require('libp2p')

// set up a Swarm, Peer Routing and Record Store instances, the last two are optional

var p2p = new Libp2p(swarm, [peerRouting, recordStore])
```

### Dialing and listening

p2p.swarm.dial(peerInfo, options, protocol, function (err, stream) {})
p2p.swarm.handleProtocol(protocol, options, handlerFunction)

### Using Peer Routing

p2p.routing.findPeers(key, function (err, peerInfos) {})

### Using Records

p2p.record.get(key, function (err, records) {})
p2p.record.store(key, record)

### Stats



## Notes

Img for ref (till we get a better graph)

![](https://cloud.githubusercontent.com/assets/1211152/9450620/a02e3a9c-4aa1-11e5-83fd-cd996a0a4b6f.png)
