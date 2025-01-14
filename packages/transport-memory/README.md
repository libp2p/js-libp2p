# @libp2p/tcp

# @libp2p/memory

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> A memory transport for libp2p

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/)
that operates in-memory only.

This is intended for testing and can only be used to connect two libp2p nodes
that are running in the same process.

## Example

```TypeScript
import { createLibp2p } from 'libp2p'
import { memory } from '@libp2p/memory'
import { multiaddr } from '@multiformats/multiaddr'

const listener = await createLibp2p({
  addresses: {
    listen: [
      '/memory/address-a'
    ]
  },
  transports: [
    memory()
  ]
})

const dialer = await createLibp2p({
  transports: [
    memory()
  ]
})

const ma = multiaddr('/memory/address-a')

// dial the listener, timing out after 10s
const connection = await dialer.dial(ma, {
  signal: AbortSignal.timeout(10_000)
})

// use connection...
```

# Install

```console
$ npm i @libp2p/memory
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pMemory` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/memory/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_memory.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/transport-memory/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/transport-memory/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
