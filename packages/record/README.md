# @libp2p/record

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> libp2p record implementation

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

This is an implementation of the [routing record format](https://github.com/libp2p/specs/blob/b9efe152c29f93f7a87931c14d78ae11e7924d5a/kad-dht/README.md?plain=1#L408-L425) used by libp2p to store data in the datastore passed to the libp2p constructor.

## Example - Deserialization

```TypeScript
import { Libp2pRecord } from '@libp2p/record'

const buf = Uint8Array.from([0, 1, 2, 3])
const record = Libp2pRecord.deserialize(buf)
```

## Example - Serialization

```TypeScript
import { Libp2pRecord } from '@libp2p/record'

const key = Uint8Array.from([0, 1, 2, 3])
const value = Uint8Array.from([0, 1, 2, 3])
const timeReceived = new Date()

const record = new Libp2pRecord(key, value, timeReceived)
const buf = record.serialize()
```

# Install

```console
$ npm i @libp2p/record
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pRecord` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/record/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_record.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/record/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/record/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
