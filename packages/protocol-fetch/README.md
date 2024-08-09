# @libp2p/fetch

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of the Fetch Protocol

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

An implementation of the Fetch protocol as described here: <https://github.com/libp2p/specs/tree/master/fetch>

The fetch protocol is a simple protocol for requesting a value corresponding to a key from a peer.

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { fetch } from '@libp2p/fetch'
import { peerIdFromString } from '@libp2p/peer-id'

const libp2p = await createLibp2p({
  services: {
    fetch: fetch()
  }
})

// Given a key (as a string) returns a value (as a Uint8Array), or undefined
// if the key isn't found.
// All keys must be prefixed by the same prefix, which will be used to find
// the appropriate key lookup function.
async function my_subsystem_key_lookup (key: string): Promise<Uint8Array | undefined> {
  // app specific callback to lookup key-value pairs.
  return Uint8Array.from([0, 1, 2, 3, 4])
}

// Enable this peer to respond to fetch requests for keys that begin with
// '/my_subsystem_key_prefix/'
libp2p.services.fetch.registerLookupFunction('/my_subsystem_key_prefix/', my_subsystem_key_lookup)

const key = '/my_subsystem_key_prefix/{...}'
const peerDst = peerIdFromString('Qmfoo...')

// Load the value from the remote peer, timing out after 10s
const value = await libp2p.services.fetch.fetch(peerDst, key, {
  signal: AbortSignal.timeout(10_000)
})
```

# Install

```console
$ npm i @libp2p/fetch
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pFetch` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/fetch/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_fetch.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-fetch/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/protocol-fetch/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
