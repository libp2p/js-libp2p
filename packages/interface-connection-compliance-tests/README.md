# @libp2p/interface-connection-compliance-tests <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Compliance tests for implementations of the libp2p Connection interface

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-connection-compliance-tests
```

## Usage

This is a test suite and interface you can use to implement a connection. The connection interface contains all the metadata associated with it, as well as an array of the streams opened through this connection. In the same way as the connection, a stream contains properties with its metadata, plus an iterable duplex object that offers a mechanism for writing and reading data, with back pressure. This module and test suite were heavily inspired by abstract-blob-store and interface-stream-muxer.

The primary goal of this module is to enable developers to pick, swap or upgrade their connection without losing the same API expectations and mechanisms such as back pressure and the ability to half close a connection.

Publishing a test suite as a module lets multiple modules ensure compatibility since they use the same test suite.

```js
import tests from '@libp2p/interface-connection-compliance-tests'

describe('your connection', () => {
  tests({
    // Options should be passed to your connection
    async setup (options) {
      return YourConnection
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})
```

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_connection_compliance_tests.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
