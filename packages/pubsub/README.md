# @libp2p/pubsub <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-pubsub.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-pubsub)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-pubsub/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-pubsub/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> libp2p pubsub base class

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/pubsub
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pPubsub` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/pubsub/dist/index.min.js"></script>
```

## Usage

```console
npm i @libp2p/pubsub
```

```javascript
import { PubSubBaseProtocol } from '@libp2p/pubsub'

class MyPubsubImplementation extends PubSubBaseProtocol {
  // .. extra methods here
}
```

## API Docs

- <https://libp2p.github.io/js-libp2p-pubsub>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
