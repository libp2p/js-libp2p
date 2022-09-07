# @libp2p/floodsub <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-floodsub)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-floodsub/actions/workflows/js-test-and-release.yml)

> libp2p-floodsub, also known as pubsub-flood or just dumbsub, this implementation of pubsub focused on delivering an API for Publish/Subscribe, but with no CastTree Forming (it just floods the network).

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Don't use this module](#dont-use-this-module)
- [Usage](#usage)
- [License](#license)
- [Contribute](#contribute)

## Install

```console
$ npm i @libp2p/floodsub
```

## Don't use this module

This module is a naive implementation of pubsub. It broadcasts all messages to all network peers, cannot provide older messages and has no protection against bad actors.

It exists for academic purposes only, you should not use it in production.

Instead please use [gossipsub](https://www.npmjs.com/package/@chainsafe/libp2p-gossipsub) - a more complete implementation which is also compatible with floodsub.

## Usage

```JavaScript
import { FloodSub } from '@libp2p/floodsub'

const fsub = new FloodSub()

await fsub.start()

fsub.addEventListener('message', (data) => {
  console.log(data)
})
fsub.subscribe('fruit')

fsub.publish('fruit', new TextEncoder().encode('banana'))
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribute

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
