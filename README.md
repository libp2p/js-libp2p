# @libp2p/logger <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-logger.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-logger)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-logger/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-logger/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> A logging component for use in js-libp2p modules

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Description](#description)
- [Example](#example)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/logger
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pLogger` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/logger/dist/index.min.js"></script>
```

## Description

A map that reports it's size to the libp2p [Metrics](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/metrics#readme) system.

If metrics are disabled a regular map is used.

## Example

```JavaScript
import { logger } from '@libp2p/logger'

const log = logger('libp2p:my:component:name')

log('something happened: %s', 'it was ok')
log.error('something bad happened: %o', err)

log('with this peer: %p', aPeerId)
log('and this base58btc: %b', aUint8Array)
log('and this base32: %t', aUint8Array)
```

```console
$ DEBUG=libp2p:* node index.js
something happened: it was ok
something bad happened: <stack trace>
with this peer: 12D3Foo
with this base58btc: Qmfoo
with this base32: bafyfoo
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
