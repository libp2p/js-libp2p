# js-libp2p-websockets

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-websockets/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-websockets?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-websockets.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-websockets)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-websockets.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-websockets)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-orange.svg?style=flat-square)

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

> JavaScript implementation of the WebSockets module that libp2p uses and that implements the interface-transport interface

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Description

`libp2p-websockets` is the WebSockets implementation compatible with libp2p.

## Usage

## Install

### npm

```sh
> npm i libp2p-websockets
```

### Constructor properties

```js
const WS = require('libp2p-websockets')

const properties = {
  upgrader,
  filter
}

const ws = new WS(properties)
```

| Name | Type | Description | Default |
|------|------|-------------|---------|
| upgrader | [`Upgrader`](https://github.com/libp2p/interface-transport#upgrader) | connection upgrader object with `upgradeOutbound` and `upgradeInbound` | **REQUIRED** |
| filter | `(multiaddrs: Array<Multiaddr>) => Array<Multiaddr>` | override transport addresses filter | **Browser:** DNS+WSS multiaddrs / **Node.js:** DNS+{WS, WSS} multiaddrs |

You can create your own address filters for this transports, or rely in the filters [provided](./src/filters.js).

The available filters are:

- `filters.all`
  - Returns all TCP and DNS based addresses, both with `ws` or `wss`.
- `filters.dnsWss`
  - Returns all DNS based addresses with `wss`.
- `filters.dnsWsOrWss`
  - Returns all DNS based addresses, both with `ws` or `wss`.

## Libp2p Usage Example

```js
const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const transportKey = Websockets.prototype[Symbol.toStringTag]
const node = await Libp2p.create({
  modules: {
    transport: [Websockets],
    streamMuxer: [MPLEX],
    connEncryption: [NOISE]
  },
  config: {
    transport: {
      [transportKey]: { // Transport properties -- Libp2p upgrader is automatically added
        filter: filters.dnsWsOrWss
      }
    }
  }
})
```

For more information see [libp2p/js-libp2p/doc/CONFIGURATION.md#customizing-transports](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-transports).

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)
