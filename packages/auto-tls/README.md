# @libp2p/auto-tls

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Automatically acquire a <peerId>.libp2p.direct TLS certificate

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

When a publicly dialable address is detected, use the p2p-forge service at
<https://registration.libp2p.direct> to acquire a valid Let's Encrypted-backed
TLS certificate, which the node can then use with the relevant transports.

The node must be configured with a listener for at least one of the following
transports:

- TCP or WS or WSS, (along with the Yamux multiplexer and TLS or Noise encryption)
- QUIC-v1
- WebTransport

It also requires the Identify protocol.

## Example - Use UPnP to hole punch and auto-upgrade to Secure WebSockets

```TypeScript
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { autoTLS } from '@libp2p/auto-tls'
import { webSockets } from '@libp2p/websockets'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { createLibp2p } from 'libp2p'

const node = await createLibp2p({
  addresses: {
    listen: [
      '/ip4/0.0.0.0/tcp/0/ws'
    ]
  },
  transports: [
    webSockets()
  ],
  connectionEncrypters: [
    noise()
  ],
  streamMuxers: [
    yamux()
  ],
  services: {
    autoTLS: autoTLS(),
    upnp: uPnPNAT()
  }
})

// ...time passes

console.info(node.getMultiaddrs())
// includes public WSS address:
// [ '/ip4/123.123.123.123/tcp/12345/wss ]
```

# Install

```console
$ npm i @libp2p/plaintext
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPlaintext` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/plaintext/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_plaintext.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-plaintext/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/connection-encrypter-plaintext/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
