# @libp2p/mplex <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mplex)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-mplex/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of <https://github.com/libp2p/mplex>

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [API](#api)
  - [`const factory = new Mplex([options])`](#const-factory--new-mplexoptions)
  - [`const muxer = factory.createStreamMuxer(components, [options])`](#const-muxer--factorycreatestreammuxercomponents-options)
  - [`muxer.onStream`](#muxeronstream)
  - [`muxer.onStreamEnd`](#muxeronstreamend)
  - [`muxer.streams`](#muxerstreams)
  - [`const stream = muxer.newStream([options])`](#const-stream--muxernewstreamoptions)
    - [`stream.close()`](#streamclose)
    - [`stream.abort([err])`](#streamaborterr)
    - [`stream.reset()`](#streamreset)
    - [`stream.timeline`](#streamtimeline)
    - [`stream.id`](#streamid)
- [Contribute](#contribute)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/mplex
```

[![](https://github.com/libp2p/interface-stream-muxer/raw/master/img/badge.png)](https://github.com/libp2p/interface-stream-muxer)

## Usage

```js
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'

const factory = new Mplex()

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

## API

### `const factory = new Mplex([options])`

Creates a factory that can be used to create new muxers.

`options` is an optional `Object` that may have the following properties:

- `maxMsgSize` - a number that defines how large mplex data messages can be in bytes, if messages are larger than this they will be sent as multiple messages (default: 1048576 - e.g. 1MB)
- `maxInboundStreams` - a number that defines how many incoming streams are allowed per connection (default: 1024)
- `maxOutboundStreams` - a number that defines how many outgoing streams are allowed per connection (default: 1024)
- `maxStreamBufferSize` - a number that defines how large the message buffer is allowed to grow (default: 1024 \* 1024 \* 4 - e.g. 4MB)
- `disconnectThreshold` - if `maxInboundStreams` is reached, close the connection if the remote continues trying to open more than this many streams per second (default: 5)

### `const muxer = factory.createStreamMuxer(components, [options])`

Create a new *duplex* stream that can be piped together with a connection in order to allow multiplexed communications.

e.g.

```js
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'

// Create a duplex muxer
const muxer = new Mplex()

// Use the muxer in a pipeline
pipe(conn, muxer, conn) // conn is duplex connection to another peer
```

`options` is an optional `Object` that may have the following properties:

- `onStream` - A function called when receiving a new stream from the remote. e.g.
  ```js
  // Receive a new stream on the muxed connection
  const onStream = stream => {
    // Read from this stream and write back to it (echo server)
    pipe(
      stream,
      source => (async function * () {
        for await (const data of source) yield data
      })(),
      stream
    )
  }
  const muxer = new Mplex({ onStream })
  // ...
  ```
  **Note:** The `onStream` function can be passed in place of the `options` object. i.e.
  ```js
  new Mplex(stream => { /* ... */ })
  ```
- `onStreamEnd` - A function called when a stream ends
  ```js
  // Receive a notification when a stream ends
  const onStreamEnd = stream => {
    // Manage any tracking changes, etc
  }
  const muxer = new Mplex({ onStreamEnd })
  // ...
  ```
- `signal` - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) which can be used to abort the muxer, *including* all of it's multiplexed connections. e.g.
  ```js
  const controller = new AbortController()
  const muxer = new Mplex({ signal: controller.signal })

  pipe(conn, muxer, conn)

  controller.abort()
  ```
- `maxMsgSize` - The maximum size in bytes the data field of multiplexed messages may contain (default 1MB)

### `muxer.onStream`

Use this property as an alternative to passing `onStream` as an option to the `Mplex` constructor.

### `muxer.onStreamEnd`

Use this property as an alternative to passing `onStreamEnd` as an option to the `Mplex` constructor.

### `muxer.streams`

Returns an `Array` of streams that are currently open. Closed streams will not be returned.

### `const stream = muxer.newStream([options])`

Initiate a new stream with the remote. Returns a [duplex stream](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it).

e.g.

```js
// Create a new stream on the muxed connection
const stream = muxer.newStream()

// Use this new stream like any other duplex stream:
pipe([1, 2, 3], stream, consume)
```

In addition to `sink` and `source` properties, this stream also has the following API, that will **normally *not* be used by stream consumers**.

#### `stream.close()`

Closes the stream for **reading**. If iterating over the source of this stream in a `for await of` loop, it will return (exit the loop) after any buffered data has been consumed.

This function is called automatically by the muxer when it receives a `CLOSE` message from the remote.

The source will return normally, the sink will continue to consume.

#### `stream.abort([err])`

Closes the stream for **reading** *and* **writing**. This should be called when a *local error* has occurred.

Note, if called without an error any buffered data in the source can still be consumed and the stream will end normally.

This will cause a `RESET` message to be sent to the remote, *unless* the sink has already ended.

The sink will return and the source will throw if an error is passed or return normally if not.

#### `stream.reset()`

Closes the stream *immediately* for **reading** *and* **writing**. This should be called when a *remote error* has occurred.

This function is called automatically by the muxer when it receives a `RESET` message from the remote.

The sink will return and the source will throw.

#### `stream.timeline`

Returns an `object` with `close` and `open` times of the stream.

#### `stream.id`

Returns a `string` with an identifier unique to **this** muxer. Identifiers are not unique across muxers.

## Contribute

The libp2p implementation in JavaScript is a work in progress. As such, there are a few things you can do right now to help out:

- Go through the modules and **check out existing issues**. This is especially useful for modules in active development. Some knowledge of IPFS/libp2p may be required, as well as the infrastructure behind it - for instance, you may need to read up on p2p and more complex operations like muxing to be able to help technically.
- **Perform code reviews**. More eyes will help a) speed the project along b) ensure quality and c) reduce possible future bugs.

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
