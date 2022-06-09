# libp2p-tracked-map <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-tracked-map/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-tracked-map/actions/workflows/js-test-and-release.yml)

> allows tracking metrics in libp2p

## Table of Contents <!-- omit in toc -->

- [Description](#description)
- [Example](#example)
- [Installation](#installation)
- [License](#license)
  - [Contribution](#contribution)

## Description

A map that reports it's size to the libp2p [Metrics](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/metrics#readme) system.

If metrics are disabled a regular map is used.

## Example

```JavaScript
import { trackedMap } from '@libp2p/tracked-map'

const map = trackedMap<string, string>({ metrics })

map.set('key', 'value')
```

## Installation

```console
$ npm i @libp2p/tracked-map
```

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
