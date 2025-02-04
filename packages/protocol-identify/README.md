# @libp2p/identify

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of the Identify Protocol

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

Use the `identify` function to add support for the [Identify protocol](https://github.com/libp2p/specs/blob/master/identify/README.md) to libp2p.

This protocol allows network peers to discover the multiaddrs the current node listens on, and the protocols it supports.

A second function, `identifyPush` is also exported to add support for [identify/push](https://github.com/libp2p/specs/blob/master/identify/README.md#identifypush).

This protocol will send updates to all connected peers when the multiaddrs or protocols of the current node change.

> \[!TIP]
> For maximum network compatibility you should configure both protocols

## Example - Enabling identify

```typescript
import { createLibp2p } from 'libp2p'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  // ...other options
  services: {
    identify: identify()
  }
})
```

## Example - Enabling identify push

```typescript
import { createLibp2p } from 'libp2p'
import { identifyPush } from '@libp2p/identify'

const node = await createLibp2p({
  // ...other options
  services: {
    identifyPush: identifyPush()
  }
})
```

# Install

```console
$ npm i @libp2p/identify
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pIdentify` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/identify/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_identify.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-identify/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-identify/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
