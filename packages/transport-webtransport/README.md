[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> JavaScript implementation of the WebTransport module that libp2p uses and that implements the interface-transport spec

# About

A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebTransport](https://www.w3.org/TR/webtransport/).

## Example

```js
import { createLibp2pNode } from 'libp2p'
import { webTransport } from '@libp2p/webtransport'
import { noise } from 'libp2p-noise'

const node = await createLibp2pNode({
  transports: [
    webTransport()
  ],
  connectionEncryption: [
    noise()
  ]
})
```

# Install

```console
$ npm i @libp2p/webtransport
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pWebtransport` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/webtransport/dist/index.min.js"></script>
```

For more information see [libp2p/js-libp2p/doc/CONFIGURATION.md#customizing-transports](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-transports).

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_webtransport.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

See the [Contributing](./CONTRIBUTING.md) doc for details on developing changes to this repo.
