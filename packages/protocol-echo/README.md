# @libp2p/echo

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of an Echo protocol

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

An implementation of a simple Echo protocol.

Any data received by the receiver will be sent back to the sender.

## Example

```TypeScript
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { echo } from '@libp2p/echo'
import { peerIdFromString } from '@libp2p/peer-id'
import { createLibp2p } from 'libp2p'

const receiver = await createLibp2p({
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  },
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  services: {
    echo: echo()
  }
})

const sender = await createLibp2p({
  addresses: {
    listen: ['/ip4/0.0.0.0/tcp/0']
  },
  connectionEncryption: [noise()],
  streamMuxers: [yamux()],
  services: {
    echo: echo()
  }
})

const stream = await sender.dialProtocol(receiver.getMultiaddrs(), sender.services.echo.protocol)

// write/read stream
```

# Install

```console
$ npm i @libp2p/echo
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pEcho` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/echo/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_echo.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
