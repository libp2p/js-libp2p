# js-multistream-select <!-- omit in toc -->

[![test & maybe release](https://github.com/libp2p/js-libp2p-multistream-select/actions/workflows/js-test-and-release.yml/badge.svg)](https://github.com/libp2p/js-libp2p-multistream-select/actions/workflows/js-test-and-release.yml)

> JavaScript implementation of [multistream-select](https://github.com/multiformats/multistream-select)

## Table of Contents <!-- omit in toc -->

- [Background](#background)
  - [What is `multistream-select`?](#what-is-multistream-select)
    - [Select a protocol flow](#select-a-protocol-flow)
- [Install](#install)
- [Usage](#usage)
  - [Dialer](#dialer)
  - [Listener](#listener)
- [API](#api)
  - [`new Dialer(duplex)`](#new-dialerduplex)
    - [Parameters](#parameters)
    - [Returns](#returns)
    - [Examples](#examples)
  - [`dialer.select(protocols, [options])`](#dialerselectprotocols-options)
    - [Parameters](#parameters-1)
    - [Returns](#returns-1)
    - [Examples](#examples-1)
  - [`dialer.ls([options])`](#dialerlsoptions)
    - [Parameters](#parameters-2)
    - [Returns](#returns-2)
    - [Examples](#examples-2)
  - [`new Listener(duplex)`](#new-listenerduplex)
    - [Parameters](#parameters-3)
    - [Returns](#returns-3)
    - [Examples](#examples-3)
  - [`listener.handle(protocols, [options])`](#listenerhandleprotocols-options)
    - [Parameters](#parameters-4)
    - [Returns](#returns-4)
    - [Examples](#examples-4)
- [License](#license)
  - [Contribution](#contribution)

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

This mode also packs a `ls` option, so that the callee can list the protocols it currently supports

## Install

```sh
npm i @libp2p/multistream-select
```

## Usage

```js
import { Dialer, Listener } from '@libp2p/multistream-select'
// You can now use
// Dialer - actively select a protocol with a remote
// Listener - handle a protocol with a remote
```

### Dialer

```js
import { pipe } from 'it-pipe'
import { Dialer } from '@libp2p/multistream-select'
import { Mplex } from '@libp2p/mplex'

const muxer = new Mplex()
const muxedStream = muxer.newStream()

const mss = new Dialer(muxedStream)

// mss.select(protocol(s))
// Select from one of the passed protocols (in priority order)
// Returns selected stream and protocol
const { stream: dhtStream, protocol } = await mss.select([
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
import { Listener } from '@libp2p/multistream-select'
import { Mplex } from '@libp2p/mplex'

const muxer = new Mplex({
  async onStream (muxedStream) {
    const mss = new Listener(muxedStream)

    // mss.handle(handledProtocols)
    // Returns selected stream and protocol
    const { stream, protocol } = await mss.handle([
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

### `new Dialer(duplex)`

Create a new multistream select "dialer" instance which can be used to negotiate a protocol to use, list all available protocols the remote supports, or do both.

#### Parameters

* `duplex` (`Object`) - A [duplex iterable stream](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it) to dial on.

#### Returns

A new multistream select dialer instance.

#### Examples

```js
const dialer = new MSS.Dialer(duplex)
```

### `dialer.select(protocols, [options])`

Negotiate a protocol to use from a list of protocols.

#### Parameters

* `protocols` (`String[]`/`String`) - A list of protocols (or single protocol) to negotiate with. Protocols are attempted in order until a match is made.
* `options` (`{ signal: AbortSignal }`) - an options object containing an AbortSignal

#### Returns

`Promise<{ stream<Object>, protocol<String> }>` - A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.

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

### `dialer.ls([options])`

List protocols that the remote supports.

#### Parameters

* `options` (`{ signal: AbortSignal }`) - an options object containing an AbortSignal

#### Returns

`String[]` - A list of all the protocols the remote supports.

#### Examples

```js
const protocols = await dialer.ls()
const wantedProto = '/ipfs-dht/2.0.0'

if (!protocols.includes(wantedProto)) {
  throw new Error('remote does not support ' + wantedProto)
}

// Now use dialer.select to use wantedProto, safe in the knowledge it is supported
```

### `new Listener(duplex)`

Construct a new multistream select "listener" instance which can be used to handle multistream protocol selections for particular protocols.

#### Parameters

* `duplex` (`Object`) - A [duplex iterable stream](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9#duplex-it) to listen on.

#### Returns

A new multistream select listener instance.

#### Examples

```js
const listener = new MSS.Listener(duplex)
```

### `listener.handle(protocols, [options])`

Handle multistream protocol selections for the given list of protocols.

#### Parameters

* `protocols` (`String[]`/`String`) - A list of protocols (or single protocol) that this listener is able to speak.
* `options` (`{ signal: AbortSignal }`) - an options object containing an AbortSignal

#### Returns

`Promise<{ stream<Object>, protocol<String> }>` - A stream for the selected protocol and the protocol that was selected from the list of protocols provided to `select`.

Note that after a protocol is handled `listener` can no longer be used.

#### Examples

```js
const { stream, protocol } = await listener.handle([
  '/ipfs-dht/1.0.0',
  '/ipfs-bitswap/1.0.0'
])
// Remote wants to speak `protocol`
```

## License

Licensed under either of

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
