# @chainsafe/libp2p-yamux <!-- omit in toc -->

[![codecov](https://img.shields.io/codecov/c/github/ChainSafe/js-libp2p-yamux.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-yamux)
[![CI](https://img.shields.io/github/actions/workflow/status/ChainSafe/js-libp2p-yamux/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/ChainSafe/js-libp2p-yamux/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Yamux stream multiplexer for libp2p

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @chainsafe/libp2p-yamux
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `ChainsafeLibp2pYamux` in the global namespace.

```html
<script src="https://unpkg.com/@chainsafe/libp2p-yamux/dist/index.min.js"></script>
```

## Usage

```js
import { yamux } from '@chainsafe/libp2p-yamux'
import { pipe } from 'it-pipe'
import { duplexPair } from 'it-pair/duplex'
import all from 'it-all'

// Connect two yamux muxers to demo basic stream multiplexing functionality

const clientMuxer = yamux({
  client: true,
  onIncomingStream: stream => {
    // echo data on incoming streams
    void stream.readable.pipeTo(stream.writable)
  },
  onStreamEnd: stream => {
    // do nothing
  }
})()

const serverMuxer = yamux({
  client: false,
  onIncomingStream: stream => {
    // echo data on incoming streams
    void stream.readable.pipeTo(stream.writable)
  },
  onStreamEnd: stream => {
    // do nothing
  }
})()

// `p` is our "connections", what we use to connect the two sides
// In a real application, a connection is usually to a remote computer
const p = duplexPair()

// connect the muxers together
pipe(p[0], clientMuxer, p[0])
pipe(p[1], serverMuxer, p[1])

// now either side can open streams
const stream0 = clientMuxer.newStream()
const stream1 = serverMuxer.newStream()

// Send some data to the other side
const encoder = new TextEncoder()
const data = [encoder.encode('hello'), encoder.encode('world')]
pipe(data, stream0)

// Receive data back
const result = await pipe(stream0, all)

// close a stream
stream1.close()

// close the muxer
clientMuxer.close()
```

## API

This library implements the `StreamMuxerFactory`, `StreamMuxer` and `Stream` interfaces defined in [`@libp2p/interfaces/stream-muxer`](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/stream-muxer).

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

- Go through the modules and **check out existing issues**. This is especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
- **Perform code reviews**. More eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.

## API Docs

- <https://ChainSafe.github.io/js-libp2p-yamux>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
