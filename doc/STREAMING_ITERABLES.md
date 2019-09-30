# Iterable Streams

> This document is a guide on how to use Iterable Streams in Libp2p. As a part of the [refactor away from callbacks](https://github.com/ipfs/js-ipfs/issues/1670), we have also moved to using Iterable Streams instead of [pull-streams](https://pull-stream.github.io/). If there are missing usage guides you feel should be added, please submit a PR!

## Table of Contents

- [Iterable Streams](#iterable-streams)
  - [Table of Contents](#table-of-contents)
  - [Usage Guide](#usage-guide)
  - [Iterable Modules](#iterable-modules)

## Usage Guide

**Coming Soon!**

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
[streaming-iterables]: https://github.com/bustle/streaming-iterables
