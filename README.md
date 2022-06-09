# libp2p-logger <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-logger/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-logger/actions/workflows/js-test-and-release.yml)

> A logging component for use in js-libp2p components

## Table of Contents <!-- omit in toc -->

- [Description](#description)
- [Installation](#installation)
- [Example](#example)
- [License](#license)
  - [Contribution](#contribution)

## Description

A map that reports it's size to the libp2p [Metrics](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/metrics#readme) system.

If metrics are disabled a regular map is used.

## Installation

```console
$ npm i @libp2p/logger
```

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

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
