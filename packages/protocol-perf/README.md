# @libp2p/perf

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of Perf Protocol

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

The Perf service implements the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md), which can be used to measure transfer performance within and across libp2p implementations.

## Example

```typescript
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { createLibp2p, type Libp2p } from 'libp2p'
import { plaintext } from '@libp2p/plaintext'
import { perf, type Perf } from '@libp2p/perf'

const ONE_MEG = 1024 * 1024
const UPLOAD_BYTES = ONE_MEG * 1024
const DOWNLOAD_BYTES = ONE_MEG * 1024

async function createNode (): Promise<Libp2p<{ perf: Perf }>> {
  return createLibp2p({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncrypters: [
      noise(), plaintext()
    ],
    streamMuxers: [
      yamux()
    ],
    services: {
      perf: perf()
    }
  })
}

const libp2p1 = await createNode()
const libp2p2 = await createNode()

for await (const output of libp2p1.services.perf.measurePerformance(libp2p2.getMultiaddrs()[0], UPLOAD_BYTES, DOWNLOAD_BYTES)) {
  console.info(output)
}

await libp2p1.stop()
await libp2p2.stop()
```

# Install

```console
$ npm i @libp2p/perf
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pPerf` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/perf/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_perf.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-perf/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-perf/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
