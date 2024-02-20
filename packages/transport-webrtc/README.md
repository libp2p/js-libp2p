# @libp2p/webrtc

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> A libp2p transport using WebRTC connections

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

A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebRTC datachannels](https://webrtc.org/).

## Example

```TypeScript
import { createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import first from 'it-first'
import { pipe } from 'it-pipe'
import { fromString, toString } from 'uint8arrays'
import { webRTC } from '@libp2p/webrtc'

const node = await createLibp2p({
  transports: [
    webRTC()
  ],
  connectionEncryption: [
    noise()
  ]
})

await node.start()

const ma = multiaddr('/ip4/0.0.0.0/udp/56093/webrtc/certhash/uEiByaEfNSLBexWBNFZy_QB1vAKEj7JAXDizRs4_SnTflsQ')
const stream = await node.dialProtocol(ma, '/my-protocol/1.0.0', {
  signal: AbortSignal.timeout(10_000)
})

await pipe(
  [fromString(`Hello js-libp2p-webrtc\n`)],
  stream,
  async function (source) {
    for await (const buf of source) {
      console.info(toString(buf.subarray()))
    }
  }
)
```

# Install

```console
$ npm i @libp2p/webrtc
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pWebrtc` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/webrtc/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_webrtc.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
