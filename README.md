# js-libp2p-tcp <!-- omit in toc -->

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp)
[![Build Status](https://github.com/libp2p/js-libp2p-tcp/actions/workflows/js-test-and-release.yml/badge.svg?branch=main)](https://github.com/libp2p/js-libp2p-tcp/actions/workflows/js-test-and-release.yml)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/src/transport/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/transport)
[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/src/connection/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/src/connection)

> JavaScript implementation of the TCP module for libp2p. It exposes the [interface-transport](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport) for dial/listen. `libp2p-tcp` is a very thin shim that adds support for dialing to a `multiaddr`. This small shim will enable libp2p to use other transports.

## Table of Contents <!-- omit in toc -->

- [Install](#install)
  - [npm](#npm)
- [Usage](#usage)
- [API](#api)
  - [Transport](#transport)
  - [Connection](#connection)
- [Contribute](#contribute)
- [Contribute](#contribute-1)
- [License](#license)
  - [Contribution](#contribution)

## Install

### npm

```sh
> npm install @libp2p/tcp
```

## Usage

```js
import { TCP } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import {pipe} from 'it-pipe'
import all from 'it-all'

// A simple upgrader that just returns the MultiaddrConnection
const upgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

const tcp = new TCP({ upgrader })

const listener = tcp.createListener({
  handler: (socket) => {
    console.log('new connection opened')
    pipe(
      ['hello', ' ', 'World!'],
      socket
    )
  }
})

const addr = multiaddr('/ip4/127.0.0.1/tcp/9090')
await listener.listen(addr)
console.log('listening')

const socket = await tcp.dial(addr)
const values = await pipe(
  socket,
  all
)
console.log(`Value: ${values.toString()}`)

// Close connection after reading
await listener.close()
```

Outputs:

```sh
listening
new connection opened
Value: hello World!
```

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/packages/libp2p-interfaces/src/transport/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/transport)

`libp2p-tcp` accepts TCP addresses as both IPFS and non IPFS encapsulated addresses, i.e:

`/ip4/127.0.0.1/tcp/4001`
`/ip4/127.0.0.1/tcp/4001/ipfs/QmHash`

(both for dialing and listening)

### Connection

[![](https://raw.githubusercontent.com/libp2p/js-libp2p-interfaces/master/packages/libp2p-interfaces/src/connection/img/badge.png)](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/connection)

## Contribute

Contributions are welcome! The libp2p implementation in JavaScript is a work in progress. As such, there's a few things you can do right now to help out:

- [Check out the existing issues](//github.com/libp2p/js-libp2p-tcp/issues).
- **Perform code reviews**.
- **Add tests**. There can never be enough tests.

Please be aware that all interactions related to libp2p are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

 - Go through the modules and **check out existing issues**. This is especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
 - **Perform code reviews**. More eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
