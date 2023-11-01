[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Implementation of Perf Protocol

# About

The `performanceService` implements the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md), which is used to measure performance within and across libp2p implementations
addresses.

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { perfService } from 'libp2p/perf'

const node = await createLibp2p({
  services: [
    perf: perfService()
  ]
})

const connection = await node.dial(multiaddr(multiaddrAddress))

const startTime = Date.now()

await node.services.perf.measurePerformance(startTime, connection, BigInt(uploadBytes), BigInt(downloadBytes))

```

## Usage

This library is an implementation of the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md) was created to evaluate the throughput of a libp2p connection. It is primarily used by the [test-plans perfomance benchmarking](https://github.com/libp2p/test-plans/tree/master/perf). It can be ran either in server mode or client mode, and accepts a server address, an amount upload-bytes and download-bytes as arguments. See below as an example:

  ```console
  $ npm run start --run-server --server-address 0.0.0.0:4001
  ```
  and in another console run:

  ```console
  $ npm run start --server-address 0.0.0.0:4001 --upload-bytes 0 --download-bytes 1000000
  ```

This will upload 0 bytes and download 1000000 bytes from the server until the connection is closed.

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_perf.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
