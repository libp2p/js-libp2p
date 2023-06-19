# @libp2p/multistream-select <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-multistream-select.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-multistream-select)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-multistream-select/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-multistream-select/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> JavaScript implementation of multistream-select

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Background](#background)
  - [What is `multistream-select`?](#what-is-multistream-select)
  - [Select a protocol flow](#select-a-protocol-flow)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/multistream-select
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pMultistreamSelect` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/multistream-select/dist/index.min.js"></script>
```

## Background

### What is `multistream-select`?

TLDR; multistream-select is protocol multiplexing per connection/stream. [Full spec here](https://github.com/multiformats/multistream-select)

### Select a protocol flow

The caller will send "interactive" messages, expecting for some acknowledgement from the callee, which will "select" the handler for the desired and supported protocol:

    < /multistream-select/0.3.0  # i speak multistream-select/0.3.0
    > /multistream-select/0.3.0  # ok, let's speak multistream-select/0.3.0
    > /ipfs-dht/0.2.3            # i want to speak ipfs-dht/0.2.3
    < na                         # ipfs-dht/0.2.3 is not available
    > /ipfs-dht/0.1.9            # What about ipfs-dht/0.1.9 ?
    < /ipfs-dht/0.1.9            # ok let's speak ipfs-dht/0.1.9 -- in a sense acts as an ACK
    > <dht-message>
    > <dht-message>
    > <dht-message>

## API Docs

- <https://libp2p.github.io/js-libp2p-multistream-select>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
