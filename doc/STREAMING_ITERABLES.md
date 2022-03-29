# Iterable Streams

> This document is a guide on how to use Iterable Streams in Libp2p. As a part of the [refactor away from callbacks](https://github.com/ipfs/js-ipfs/issues/1670), we have also moved to using Iterable Streams instead of [pull-streams](https://pull-stream.github.io/). If there are missing usage guides you feel should be added, please submit a PR!

## Table of Contents

- [Iterable Streams](#iterable-streams)
  - [Table of Contents](#table-of-contents)
  - [Usage Guide](#usage-guide)
    - [Transforming Bidirectional Data](#transforming-bidirectional-data)
  - [Iterable Stream Types](#iterable-stream-types)
    - [Source](#source)
    - [Sink](#sink)
    - [Transform](#transform)
    - [Duplex](#duplex)
  - [Iterable Modules](#iterable-modules)

## Usage Guide

### Transforming Bidirectional Data

Sometimes you may need to wrap an existing duplex stream in order to perform incoming and outgoing [transforms](#transform) on data. This type of wrapping is commonly used in stream encryption/decryption. Using [it-pair][it-pair] and [it-pipe][it-pipe], we can do this rather easily, given an existing [duplex iterable](#duplex).

```js
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'

// Wrapper is what we will write and read from
// This gives us two duplex iterables that are internally connected
const [internal, external] = duplexPair()

// Now we can pipe our wrapper to the existing duplex iterable
pipe(
  external, // The external half of the pair interacts with the existing duplex
  outgoingTransform, // A transform iterable to send data through (ie: encrypting)
  existingDuplex, // The original duplex iterable we are wrapping
  incomingTransform, // A transform iterable to read data through (ie: decrypting)
  external
)

// We can now read and write from the other half of our pair
pipe(
  ['some data'],
  internal, // The internal half of the pair is what we will interact with to read/write data
  async (source) => {
    for await (const chunk of source) {
      console.log('Data: %s', chunk.toString())
      // > Data: some data
    }
  }
)
```

## Iterable Stream Types

These types are pulled from [@alanshaw's gist](https://gist.github.com/alanshaw/591dc7dd54e4f99338a347ef568d6ee9) on streaming iterables.

### Source

A "source" is something that can be consumed. It is an iterable object.

```js
const ints = {
  [Symbol.asyncIterator] () {
    let i = 0
    return {
      async next () {
        return { done: false, value: i++ }
      }
    }
  }
}

// or, more succinctly using a generator and for/await:

const ints = (async function * () {
  let i = 0
  while (true) yield i++
})()
```

### Sink

A "sink" is something that consumes (or drains) a source. It is a function that takes a source and iterates over it. It optionally returns a value.

```js
const logger = async source => {
  const it = source[Symbol.asyncIterator]()
  while (true) {
    const { done, value } = await it.next()
    if (done) break
    console.log(value) // prints 0, 1, 2, 3...
  }
}

// or, more succinctly using a generator and for/await:

const logger = async source => {
  for await (const chunk of source) {
    console.log(chunk) // prints 0, 1, 2, 3...
  }
}
```

### Transform

A "transform" is both a sink _and_ a source where the values it consumes and the values that can be consumed from it are connected in some way. It is a function that takes a source and returns a source.

```js
const doubler = source => {
  return {
    [Symbol.asyncIterator] () {
      const it = source[Symbol.asyncIterator]()
      return {
        async next () {
          const { done, value } = await it.next()
          if (done) return { done }
          return { done, value: value * 2 }
        }
        return () {
          return it.return && it.return()
        }
      }
    }
  }
}

// or, more succinctly using a generator and for/await:

const doubler = source => (async function * () {
  for await (const chunk of source) {
    yield chunk * 2
  }
})()
```

### Duplex

A "duplex" is similar to a transform but the values it consumes are not necessarily connected to the values that can be consumed from it. It is an object with two properties, `sink` and `source`.

```js
const duplex = {
  sink: async source => {/* ... */},
  source: { [Symbol.asyncIterator] () {/* ... */} }
}
```

## Iterable Modules

- [it-handshake][it-handshake] Handshakes for binary protocols with iterable streams.
- [it-length-prefixed][it-length-prefixed] Streaming length prefixed buffers with async iterables.
- [it-pair][it-pair] Paired streams that are internally connected.
- [it-pipe][it-pipe] Create a pipeline of iterables. Works with duplex streams.
- [it-pushable][it-pushable] An iterable that you can push values into.
- [it-reader][it-reader] Read an exact number of bytes from a binary, async iterable.
- [streaming-iterables][streaming-iterables] A Swiss army knife for async iterables.

[it-handshake]: https://github.com/jacobheun/it-handshake
[it-length-prefixed]: https://github.com/alanshaw/it-length-prefixed
[it-pair]: https://github.com/alanshaw/it-pair
[it-pipe]: https://github.com/alanshaw/it-pipe
[it-pushable]: https://github.com/alanshaw/it-pushable
[it-reader]: https://github.com/alanshaw/it-reader
[streaming-iterables]: https://github.com/reconbot/streaming-iterables
