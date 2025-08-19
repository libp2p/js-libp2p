# @libp2p/daemon-server

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-daemon.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-daemon/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p-daemon/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> API server for libp2p-daemon instances

# Install

```console
$ npm i @libp2p/daemon-server
```

# Specs

The specs for the daemon are currently housed in the go implementation. You can read them at [libp2p/go-libp2p-daemon](https://github.com/libp2p/go-libp2p-daemon/blob/master/specs/README.md)

# Usage

```js
import { createServer } from '@libp2p/daemon-server'
import { createLibp2p } from 'libp2p'
import { multiaddr } from '@multiformats/multiaddr'

const libp2p = await createLibp2p({
  // ..config
})

const multiaddr = multiaddr('/ip4/0.0.0.0/tcp/0')

const server = await createServer(multiaddr, libp2p)
await server.start()
```

# API Docs

- <https://libp2p.github.io/js-libp2p-daemon/modules/_libp2p_daemon_server.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p-daemon/blob/main/packages/libp2p-daemon-server/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p-daemon/blob/main/packages/libp2p-daemon-server/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
