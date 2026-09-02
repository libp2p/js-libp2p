# @libp2p/yamux

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Yamux stream multiplexer for libp2p

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

This module is a JavaScript implementation of [Yamux from Hashicorp](https://github.com/hashicorp/yamux/blob/master/spec.md) designed to be used with [js-libp2p](https://github.com/libp2p/js-libp2p).

Formerly published as [`@chainsafe/libp2p-yamux`](https://www.npmjs.com/package/@chainsafe/libp2p-yamux).

## Example - Configure libp2p with Yamux

```typescript
import { createLibp2p } from 'libp2p'
import { yamux } from '@libp2p/yamux'

const node = await createLibp2p({
  // ... other options
  streamMuxers: [
    yamux()
  ]
})
```

# Install

```console
$ npm i @libp2p/yamux
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pYamux` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/yamux/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_yamux.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/stream-multiplexer-yamux/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/stream-multiplexer-yamux/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
