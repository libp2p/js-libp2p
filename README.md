# @libp2p/tcp <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-tcp/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-tcp/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> A TCP transport for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/tcp
```

## Usage

```js
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import all from 'it-all'

// A simple upgrader that just returns the MultiaddrConnection
const upgrader = {
  upgradeInbound: async maConn => maConn,
  upgradeOutbound: async maConn => maConn
}

const transport = tcp()()

const listener = transport.createListener({
  upgrader,
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

const socket = await transport.dial(addr, { upgrader })
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

## API Docs

- <https://libp2p.github.io/js-libp2p-tcp>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
