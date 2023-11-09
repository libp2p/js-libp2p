[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amaster)

> Implementation of the Fetch Protocol

# About

An implementation of the Fetch protocol as described here: <https://github.com/libp2p/specs/tree/master/fetch>

The fetch protocol is a simple protocol for requesting a value corresponding to a key from a peer.

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { fetch } from '@libp2p/fetch'

const libp2p = await createLibp2p({
  services: {
    fetch: fetch()
  }
})

// Given a key (as a string) returns a value (as a Uint8Array), or null if the key isn't found.
// All keys must be prefixed my the same prefix, which will be used to find the appropriate key
// lookup function.
async function my_subsystem_key_lookup(key) {
  // app specific callback to lookup key-value pairs.
}

// Enable this peer to respond to fetch requests for keys that begin with '/my_subsystem_key_prefix/'
libp2p.fetch.registerLookupFunction('/my_subsystem_key_prefix/', my_subsystem_key_lookup)

const key = '/my_subsystem_key_prefix/{...}'
const peerDst = PeerId.parse('Qmfoo...') // or Multiaddr instance
const value = await libp2p.fetch(peerDst, key)
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

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
