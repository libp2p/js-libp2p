js-libp2p
=========

![](https://raw.githubusercontent.com/diasdavid/specs/libp2p-spec/protocol/network/figs/logo.png)

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/diasdavid/js-libp2p.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-libp2p)
![coverage](https://img.shields.io/badge/coverage-%3F-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/diasdavid/js-libp2p.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript implementation of libp2p

libp2p is a networking stack and library modularized out of The IPFS Project, and bundled separately for other tools to use.

## Table of Contents

- [Background](#background)
  - [Packages](#packages)
  - [Notes](#notes)
- [Install](#install)
- [Usage](#usage)
  - [Setting everything up](#setting-everything-up)
  - [Dialing and listening](#dialing-and-listening)
  - [Using Peer Routing](#using-peer-routing)
  - [Using Records](#using-records)
  - [Stats](#stats)
- [Contribute](#contribute)
- [License](#license)

## Background

libp2p is the product of a long, and arduous quest of understanding -- a deep dive into the internet's network stack, and plentiful peer-to-peer protocols from the past. Building large scale peer-to-peer systems has been complex and difficult in the last 15 years, and libp2p is a way to fix that. It is a "network stack" -- a protocol suite -- that cleanly separates concerns, and enables sophisticated applications to only use the protocols they absolutely need, without giving up interoperability and upgradeability. libp2p grew out of IPFS, but it is built so that lots of people can use it, for lots of different projects.

We will be writing a set of docs, posts, tutorials, and talks to explain what p2p is, why it is tremendously useful, and how it can help your existing and new projects.

### Packages

| Package | Version | Dependencies | DevDependencies |
|--------|-------|------------|----------|
| [`peer-book`](//github.com/libp2p/js-peer-book) | [![npm](https://img.shields.io/npm/v/peer-book.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-book/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-peer-book.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book) | [![devDependency Status](https://david-dm.org/libp2p/js-peer-book/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-book?type=dev) |
| [`libp2p-ipfs`](//github.com/ipfs/js-libp2p-ipfs) | [![npm](https://img.shields.io/npm/v/libp2p-ipfs.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-libp2p-ipfs/releases) | [![Dependency Status](https://david-dm.org/ipfs/js-libp2p-ipfs.svg?style=flat-square)](https://david-dm.org/ipfs/js-libp2p-ipfs) | [![devDependency Status](https://david-dm.org/ipfs/js-libp2p-ipfs/dev-status.svg?style=flat-square)](https://david-dm.org/ipfs/js-libp2p-ipfs?type=dev) |
| [`libp2p-ipfs-browser`](//github.com/ipfs/js-libp2p-ipfs-browser) | [![npm](https://img.shields.io/npm/v/libp2p-ipfs-browser.svg?maxAge=86400&style=flat-square)](//github.com/ipfs/js-libp2p-ipfs-browser/releases) | [![Dependency Status](https://david-dm.org/ipfs/js-libp2p-ipfs-browser.svg?style=flat-square)](https://david-dm.org/ipfs/js-libp2p-ipfs-browser) | [![devDependency Status](https://david-dm.org/ipfs/js-libp2p-ipfs-browser/dev-status.svg?style=flat-square)](https://david-dm.org/ipfs/js-libp2p-ipfs-browser?type=dev) |
| [`libp2p-secio`](//github.com/libp2p/js-libp2p-secio) | [![npm](https://img.shields.io/npm/v/libp2p-secio.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-secio/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-secio.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-secio/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-secio?type=dev) |
| [`libp2p-swarm`](//github.com/diasdavid/js-libp2p-swarm) | [![npm](https://img.shields.io/npm/v/libp2p-swarm.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-swarm/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-swarm.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-swarm) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-swarm/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-swarm?type=dev) |
| [`libp2p-ping`](//github.com/diasdavid/js-libp2p-ping) | [![npm](https://img.shields.io/npm/v/libp2p-ping.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-ping/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-ping.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-ping) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-ping/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-ping?type=dev) |
| [`interface-connection`](//github.com/diasdavid/interface-connection) | [![npm](https://img.shields.io/npm/v/interface-connection.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/interface-connection/releases) | [![Dependency Status](https://david-dm.org/diasdavid/interface-connection.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-connection) | [![devDependency Status](https://david-dm.org/diasdavid/interface-connection/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-connection?type=dev) |
| [`libp2p-utp`](//github.com/diasdavid/js-libp2p-utp) | [![npm](https://img.shields.io/npm/v/libp2p-utp.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-utp/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-utp.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-utp) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-utp/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-utp?type=dev) |
| [`interface-stream-muxer`](//github.com/diasdavid/interface-stream-muxer) | [![npm](https://img.shields.io/npm/v/interface-stream-muxer.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/interface-stream-muxer/releases) | [![Dependency Status](https://david-dm.org/diasdavid/interface-stream-muxer.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-stream-muxer) | [![devDependency Status](https://david-dm.org/diasdavid/interface-stream-muxer/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-stream-muxer?type=dev) |
| [`libp2p-spdy`](//github.com/diasdavid/js-libp2p-spdy) | [![npm](https://img.shields.io/npm/v/libp2p-spdy.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-spdy/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-spdy.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-spdy) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-spdy/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-spdy?type=dev) |
| [`libp2p-kad-routing`](//github.com/diasdavid/js-libp2p-kad-routing) | [![npm](https://img.shields.io/npm/v/libp2p-kad-routing.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-kad-routing/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-kad-routing.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-kad-routing) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-kad-routing/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-kad-routing?type=dev) |
| [`libp2p-mdns-discovery`](//github.com/diasdavid/js-libp2p-mdns-discovery) | [![npm](https://img.shields.io/npm/v/libp2p-mdns-discovery.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-mdns-discovery/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-mdns-discovery.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-mdns-discovery) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-mdns-discovery/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-mdns-discovery?type=dev) |
| [`libp2p-railing`](//github.com/diasdavid/js-libp2p-railing) | [![npm](https://img.shields.io/npm/v/libp2p-railing.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-railing/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-railing.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-railing) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-railing/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-railing?type=dev) |
| [`libp2p-record`](//github.com/diasdavid/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/libp2p-record.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-record/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-record.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-record) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-record/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-record?type=dev) |
| [`interface-record-store`](//github.com/diasdavid/interface-record-store) | [![npm](https://img.shields.io/npm/v/interface-record-store.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/interface-record-store/releases) | [![Dependency Status](https://david-dm.org/diasdavid/interface-record-store.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-record-store) | [![devDependency Status](https://david-dm.org/diasdavid/interface-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/interface-record-store?type=dev) |
| [`libp2p-distributed-record-store`](//github.com/diasdavid/js-libp2p-distributed-record-store) | [![npm](https://img.shields.io/npm/v/undefined.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-distributed-record-store/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-distributed-record-store.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-distributed-record-store) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-distributed-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-distributed-record-store?type=dev) |
| [`libp2p-kad-record-store`](//github.com/diasdavid/js-libp2p-kad-record-store) | [![npm](https://img.shields.io/npm/v/libp2p-kad-record-store.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-kad-record-store/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-kad-record-store.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-kad-record-store) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-kad-record-store/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-kad-record-store?type=dev) |
| [`libp2p-websockets`](//github.com/diasdavid/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-libp2p-websockets/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-websockets) | [![devDependency Status](https://david-dm.org/diasdavid/js-libp2p-websockets/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-libp2p-websockets?type=dev) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Dependency Status](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![devDependency Status](https://david-dm.org/libp2p/js-libp2p-webrtc-star/dev-status.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star?type=dev) |
| [`multistream-select`](//github.com/diasdavid/js-multistream) | [![npm](https://img.shields.io/npm/v/multistream-select.svg?maxAge=86400&style=flat-square)](//github.com/diasdavid/js-multistream/releases) | [![Dependency Status](https://david-dm.org/diasdavid/js-multistream.svg?style=flat-square)](https://david-dm.org/diasdavid/js-multistream) | [![devDependency Status](https://david-dm.org/diasdavid/js-multistream/dev-status.svg?style=flat-square)](https://david-dm.org/diasdavid/js-multistream?type=dev) |

### Notes

Img for ref (till we get a better graph)

![](https://cloud.githubusercontent.com/assets/1211152/9450620/a02e3a9c-4aa1-11e5-83fd-cd996a0a4b6f.png)

## Install

```sh
npm i --save libp2p
```

## Usage

> **This is a work in progress. The interface might change at anytime.**

libp2p expects a [Record Store interface](https://github.com/diasdavid/abstract-record-store), a swarm and one or more Peer Routers that implement the [Peer Routing](https://github.com/diasdavid/abstract-peer-routing), the goal is to keep simplicity and plugability while the remaining modules execute the heavy lifting.

libp2p becomes very simple and basically acts as a glue for every module that compose this library. Since it can be highly customized, it requires some setup. What we recommend is to have a libp2p build for the system you are developing taking into account in your needs (e.g. for a browser working version of libp2p that acts as the network layer of IPFS, we have a built and minified version that browsers can require)

### Setting everything up

```js
var Libp2p = require('libp2p')

// set up a Swarm, Peer Routing and Record Store instances, the last two are optional

var p2p = new Libp2p(swarm, [peerRouting, recordStore])
```

### Dialing and listening

```js
p2p.swarm.dial(peerInfo, options, protocol, function (err, stream) {})
p2p.swarm.handleProtocol(protocol, options, handlerFunction)
```

### Using Peer Routing

```js
p2p.routing.findPeers(key, function (err, peerInfos) {})
```

### Using Records

```js
p2p.record.get(key, function (err, records) {})
p2p.record.store(key, record)
```

### Stats

TODO

## Contribute

THe libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This would be especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrasture behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. Most of this has been developed by @diasdavid, which means that more eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.
 - **Add tests**. There can never be enough tests.

## License

[MIT](LICENSE) © David Dias
