# @libp2p/websockets <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websockets)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-websockets/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of the WebSockets module that libp2p uses and that implements the interface-transport spec

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Description](#description)
- [Usage](#usage)
  - [Constructor properties](#constructor-properties)
- [Libp2p Usage Example](#libp2p-usage-example)
- [API](#api)
  - [Transport](#transport)
  - [Connection](#connection)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/websockets
```

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Description

`libp2p-websockets` is the WebSockets implementation compatible with libp2p.

## Usage

```sh
> npm i @libp2p/websockets
```

### Constructor properties

```js
import { WebSockets } from '@libp2p/websockets'

const properties = {
  upgrader,
  filter
}

const ws = new WebSockets(properties)
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
import Libp2p from 'libp2p'
import { Websockets } from '@libp2p/websockets'
import filters from 'libp2p-websockets/filters'
import { MPLEX } from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'

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

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
