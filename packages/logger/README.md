# @libp2p/logger

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> A logging component for use in js-libp2p modules

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

A logger for libp2p based on [weald](https://www.npmjs.com/package/weald), a TypeScript port of the venerable [debug](https://www.npmjs.com/package/debug) module.

## Example

```TypeScript
import { logger } from '@libp2p/logger'

const log = logger('libp2p:my:component:name')

try {
  // an operation
  log('something happened: %s', 'it was ok')
} catch (err) {
  log.error('something bad happened: %o', err)
}

log('with this peer: %p', {})
log('and this base58btc: %b', Uint8Array.from([0, 1, 2, 3]))
log('and this base32: %t', Uint8Array.from([4, 5, 6, 7]))
```

```console
$ DEBUG=libp2p:* node index.js
something happened: it was ok
something bad happened: <stack trace>
with this peer: 12D3Foo
with this base58btc: Qmfoo
with this base32: bafyfoo
```

# Install

```console
$ npm i @libp2p/logger
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pLogger` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/logger/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_logger.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/logger/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/logger/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
