# @libp2p/pnet

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Implementation of Connection protection management via a shared secret

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

Connection protection management for libp2p leveraging PSK encryption via XSalsa20.

## Example

```typescript
import { createLibp2p } from 'libp2p'
import { preSharedKey, generateKey } from '@libp2p/pnet'

// Create a Uint8Array and write the swarm key to it
const swarmKey = new Uint8Array(95)
generateKey(swarmKey)

const node = await createLibp2p({
  // ...other options
  connectionProtector: preSharedKey({
    psk: swarmKey
  })
})
```

## Private Shared Keys

Private Shared Keys are expected to be in the following format:

```
/key/swarm/psk/1.0.0/
/base16/
dffb7e3135399a8b1612b2aaca1c36a3a8ac2cd0cca51ceeb2ced87d308cac6d
```

## PSK Generation

A utility method has been created to generate a key for your private network. You can use one of the methods below to generate your key.

### From a module using libp2p

If you have a module locally that depends on libp2p, you can run the following from that project, assuming the node\_modules are installed.

```console
node -e "import('@libp2p/pnet').then(({ generateKey }) => generateKey(process.stdout))" > swarm.key
```

### Programmatically

```TypeScript
import fs from 'fs'
import { generateKey } from '@libp2p/pnet'

const swarmKey = new Uint8Array(95)
generateKey(swarmKey)

fs.writeFileSync('swarm.key', swarmKey)
```

# Install

```console
$ npm i @libp2p/pnet
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pPnet` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/pnet/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_pnet.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/pnet/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/pnet/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
