# @libp2p/multistream-select <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![IRC](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-multistream-select.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-multistream-select)
[![CI](https://img.shields.io/github/workflow/status/libp2p/js-libp2p-interfaces/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/libp2p/js-libp2p-multistream-select/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of multistream-select

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Background](#background)
  - [What is `multistream-select`?](#what-is-multistream-select)
    - [Select a protocol flow](#select-a-protocol-flow)
- [Usage](#usage)
  - [Dialer](#dialer)
  - [Listener](#listener)
- [API](#api)
  - [`mss.select(dulpex, protocols, [options])`](#mssselectdulpex-protocols-options)
    - [Parameters](#parameters)
    - [Returns](#returns)
    - [Examples](#examples)
  - [`mss.handle(duplex, protocols, [options])`](#msshandleduplex-protocols-options)
    - [Parameters](#parameters-1)
    - [Returns](#returns-1)
    - [Examples](#examples-1)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/multistream-select
```

## Background

### What is `multistream-select`?

TLDR; multistream-select is protocol multiplexing per connection/stream. [Full spec here](https://github.com/multiformats/multistream-select)

#### Select a protocol flow

The caller will send "interactive" messages, expecting for some acknowledgement from the callee, which will "select" the handler for the desired and supported protocol:

```console
< /multistream-select/0.3.0  # i speak multistream-select/0.3.0
> /multistream-select/0.3.0  # ok, let's speak multistream-select/0.3.0
> /ipfs-dht/0.2.3            # i want to speak ipfs-dht/0.2.3
< na                         # ipfs-dht/0.2.3 is not available
> /ipfs-dht/0.1.9            # What about ipfs-dht/0.1.9 ?
< /ipfs-dht/0.1.9            # ok let's speak ipfs-dht/0.1.9 -- in a sense acts as an ACK
> <dht-message>
> <dht-message>
> <dht-message>
```

## Usage

```js
import { select, handle } from '@libp2p/multistream-select'
// You can now use
// select - actively select a protocol with a remote
// handle - handle a protocol with a remote
```

### Dialer

```js
import { pipe } from 'it-pipe'
import * as mss from '@libp2p/multistream-select'
import { Mplex } from '@libp2p/mplex'

const muxer = new Mplex()
const muxedStream = muxer.newStream()

// mss.select(protocol(s))
// Select from one of the passed protocols (in priority order)
// Returns selected stream and protocol
const { stream: dhtStream, protocol } = await mss.select(muxedStream, [
  // This might just be different versions of DHT, but could be different impls
  '/ipfs-dht/2.0.0', // Most of the time this will probably just be one item.
  '/ipfs-dht/1.0.0'
])

// Typically this stream will be passed back to the caller of libp2p.dialProtocol
//
// ...it might then do something like this:
// try {
//   await pipe(
//     [uint8ArrayFromString('Some DHT data')]
//     dhtStream,
//     async source => {
//       for await (const chunk of source)
//         // DHT response data
//     }
//   )
// } catch (err) {
//   // Error in stream
// }
```

### Listener

```js
import { pipe } from 'it-pipe'
import * as mss from '@libp2p/multistream-select'
import { Mplex } from '@libp2p/mplex'

const muxer = new Mplex({
  async onStream (muxedStream) {
    // mss.handle(handledProtocols)
    // Returns selected stream and protocol
    const { stream, protocol } = await mss.handle(muxedStream, [
      '/ipfs-dht/1.0.0',
      '/ipfs-bitswap/1.0.0'
    ])

    // Typically here we'd call the handler function that was registered in
    // libp2p for the given protocol:
    // e.g. handlers[protocol].handler(stream)
    //
    // If protocol was /ipfs-dht/1.0.0 it might do something like this:
    // try {
    //   await pipe(
    //     dhtStream,
    //     source => (async function * () {
    //       for await (const chunk of source)
    //         // Incoming DHT data -> process and yield to respond
    //     })(),
    //     dhtStream
    //   )
    // } catch (err) {
    //   // Error in stream
    // }
  }
})
```

## API

### `mss.select(dulpex, protocols, [options])`

Negotiate a protocol to use from a list of protocols.

#### Parameters

- `duplex` (`Duplex`) - A [duplex iterable stream](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it) to dial on.
- `protocols` (`string[]`/`string`) - A list of protocols (or single protocol) to negotiate with. Protocols are attempted in order until a match is made.
- `options` (`{ signal: AbortSignal, writeBytes?: boolean }`) - an options object containing an AbortSignal and an optional boolean `writeBytes` - if this is true, `Uint8Array`s will be written into `duplex`, otherwise `Uint8ArrayList`s will

#### Returns

`Promise<{ stream<Duplex>, protocol<string> }>` - A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.

Note that after a protocol is selected `dialer` can no longer be used.

#### Examples

```js
const { stream, protocol } = await dialer.select([
  // This might just be different versions of DHT, but could be different impls
  '/ipfs-dht/2.0.0', // Most of the time this will probably just be one item.
  '/ipfs-dht/1.0.0'
])
// Now talk `protocol` on `stream`
```

### `mss.handle(duplex, protocols, [options])`

Handle multistream protocol selections for the given list of protocols.

#### Parameters

- `duplex` (`Duplex`) - A [duplex iterable stream](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it) to listen on.
- `protocols` (`String[]`/`String`) - A list of protocols (or single protocol) that this listener is able to speak.
- `options` (`{ signal: AbortSignal, writeBytes?: boolean }`) - an options object containing an AbortSignal and an optional boolean `writeBytes` - if this is true, `Uint8Array`s will be written into `duplex`, otherwise `Uint8ArrayList`s will

#### Returns

`Promise<{ stream<Duplex>, protocol<string> }>` - A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.

Note that after a protocol is handled `listener` can no longer be used.

#### Examples

```js
const { stream, protocol } = await mss.handle(duplex, [
  '/ipfs-dht/1.0.0',
  '/ipfs-bitswap/1.0.0'
])
// Remote wants to speak `protocol`
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
