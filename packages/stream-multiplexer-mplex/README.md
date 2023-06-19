# @libp2p/mplex <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mplex)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-mplex/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-mplex/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> JavaScript implementation of <https://github.com/libp2p/mplex>

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/mplex
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pMplex` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/mplex/dist/index.min.js"></script>
```

[![](https://github.com/libp2p/interface-stream-muxer/raw/master/img/badge.png)](https://github.com/libp2p/interface-stream-muxer)

## Usage

```js
import { mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'

const factory = mplex()

const muxer = factory.createStreamMuxer(components, {
  onStream: stream => { // Receive a duplex stream from the remote
    // ...receive data from the remote and optionally send data back
  },
  onStreamEnd: stream => {
    // ...handle any tracking you may need of stream closures
  }
})

pipe(conn, muxer, conn) // conn is duplex connection to another peer

const stream = muxer.newStream() // Create a new duplex stream to the remote

// Use the duplex stream to send some data to the remote...
pipe([1, 2, 3], stream)
```

## API Docs

- <https://libp2p.github.io/js-libp2p-mplex>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
