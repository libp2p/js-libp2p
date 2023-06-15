# @libp2p/interface-keys <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Keys interface for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Using the Test Suite](#using-the-test-suite)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/interface-keys
```

## Using the Test Suite

You can also check out the [internal test suite](../../test/crypto/compliance.spec.js) to see the setup in action.

```js
const tests = require('libp2p-interfaces-compliance-tests/keys')
const yourKeys = require('./your-keys')

tests({
  setup () {
    // Set up your keys if needed, then return it
    return yourKeys
  },
  teardown () {
    // Clean up your keys if needed
  }
})
```

## API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_interface_keys.html>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
