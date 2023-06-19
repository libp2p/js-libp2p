# @libp2p/peer-collections <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-peer-collections.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-peer-collections)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-peer-collections/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-peer-collections/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Stores values against a peer id

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Description](#description)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/peer-collections
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPeerCollections` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/peer-collections/dist/index.min.js"></script>
```

## Description

We can't use PeerIds as collection keys because collection keys are compared using same-value-zero equality, so this is just a group of collections that stringifies PeerIds before storing them.

PeerIds cache stringified versions of themselves so this should be a cheap operation.

## API Docs

- <https://libp2p.github.io/js-libp2p-peer-collections>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
