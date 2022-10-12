# @libp2p/websockets <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websockets)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-websockets/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-websockets/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of the WebSockets module that libp2p uses and that implements the interface-transport spec

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
  - [Constructor properties](#constructor-properties)
- [Libp2p Usage Example](#libp2p-usage-example)
- [API](#api)
  - [Transport](#transport)
  - [Connection](#connection)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/websockets
```

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Usage

```sh
> npm i @libp2p/websockets
```

### Constructor properties

```js
import { createLibp2pNode } from 'libp2p'
import { webSockets } from '@libp2p/webrtc-direct'

const node = await createLibp2p({
  transports: [
    webSockets()
  ]
  //... other config
})
await node.start()
await node.dial('/ip4/127.0.0.1/tcp/9090/ws')
```

| Name     | Type                                                                                                                       | Description                                                            | Default                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| upgrader | [`Upgrader`](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport#upgrader) | connection upgrader object with `upgradeOutbound` and `upgradeInbound` | **REQUIRED**                                                            |
| filter   | `(multiaddrs: Array<Multiaddr>) => Array<Multiaddr>`                                                                       | override transport addresses filter                                    | **Browser:** DNS+WSS multiaddrs / **Node.js:** DNS+{WS, WSS} multiaddrs |

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
import { createLibp2pNode } from 'libp2p'
import { websockets } from '@libp2p/websockets'
import filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { noise } from '@libp2p/noise'

const transportKey = Websockets.prototype[Symbol.toStringTag]
const node = await Libp2p.create({
  transport: [
    websockets({
      // connect to all sockets, even insecure ones
      filters: filters.all
    })
  ],
  streamMuxers: [
    mplex()
  ],
  connectionEncryption: [
    noise()
  ]
})
```

For more information see [libp2p/js-libp2p/doc/CONFIGURATION.md#customizing-transports](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-transports).

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
