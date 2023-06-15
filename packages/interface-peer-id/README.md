# @libp2p/interface-peer-id <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Peer Identifier interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Modules that implement the interface](#modules-that-implement-the-interface)
- [Badge](#badge)
- [Usage](#usage)
  - [Node.js](#nodejs)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-peer-id
```

The primary goal of this module is to enable developers to implement PeerId modules. This module and test suite was heavily inspired by earlier implementation of [PeerId](https://github.com/libp2p/js-peer-id).

Publishing a test suite as a module lets multiple modules all ensure compatibility since they use the same test suite.

The API is presented with both Node.js and Go primitives, however, there is not actual limitations for it to be extended for any other language, pushing forward the cross compatibility and interop through different stacks.

## Modules that implement the interface

- [JavaScript libp2p-peer-id](https://github.com/libp2p/js-libp2p-peer-id)

Send a PR to add a new one if you happen to find or write one.

## Badge

Include this badge in your readme if you make a new module that uses interface-peer-id API.

![](/img/badge.png)

## Usage

### Node.js

Install `libp2p-interfaces-compliance-tests` as one of the development dependencies of your project and as a test file. Then, using `mocha` (for JavaScript) or a test runner with compatible API, do:

```js
const tests = require('libp2p-interfaces-compliance-tests/peer-id')

describe('your peer id', () => {
  // use all of the test suits
  tests({
    setup () {
      return YourPeerIdFactory
    },
    teardown () {
      // Clean up any resources created by setup()
    }
  })
})
```

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_peer_id.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
