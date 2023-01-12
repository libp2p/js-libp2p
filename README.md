# @libp2p/webtransport <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-webtransport.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webtransport)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-webtransport/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p-webtransport/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> JavaScript implementation of the WebTransport module that libp2p uses and that implements the interface-transport spec

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Description](#description)
- [Usage](#usage)
- [Libp2p Usage Example](#libp2p-usage-example)
- [API](#api)
  - [Transport](#transport)
  - [Connection](#connection)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/webtransport
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pWebtransport` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/webtransport/dist/index.min.js"></script>
```

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## Description

`libp2p-webtransport` is the WebTransport transport implementation compatible with libp2p.

## Usage

```sh
> npm i @libp2p/webtransport
```

## Libp2p Usage Example

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

For more information see [libp2p/js-libp2p/doc/CONFIGURATION.md#customizing-transports](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-transports).

## API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

## API Docs

- <https://libp2p.github.io/js-libp2p-webtransport>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
