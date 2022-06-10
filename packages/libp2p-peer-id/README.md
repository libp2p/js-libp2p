# @libp2p/peer-id <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-peer-id/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-peer-id/actions/workflows/js-test-and-release.yml)

> Implementation of @libp2p/interface-peer-d

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Description](#description)
- [Example](#example)
- [License](#license)
  - [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/peer-id
```

## Description

A basic implementation of a peer id

## Example

```JavaScript
import { PeerId } from '@libp2p/peer-id'

const id = new PeerId(...)

console.log(id.toCid())
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
