# @libp2p/keychain

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Generate and securely store private keys at rest

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

A WebCrypto-first keychain that stores private keys encrypted at rest.

## Example

Configure the keychain as a libp2p service:

```TypeScript
import { keychain } from '@libp2p/keychain'
import { createLibp2p } from 'libp2p'

const node = await createLibp2p({
  services: {
    keychain: keychain({
      password: 'a password of at least 20 characters'
    })
  }
})

const key = await node.services.keychain.generateKey('my-key', { type: 'ECDSA' })

for await (const { id, name } of node.services.keychain.listKeys()) {
  console.info(name, id)
}

const exported = await node.services.keychain.exportKey('my-key')
const signature = await exported.sign(Uint8Array.from([0, 1, 2, 3]))
```

## Standalone use

Outside libp2p, pass a datastore and a `CryptoLoader`:

```TypeScript
import { defaultCryptoLoader, generateKeyPair } from '@libp2p/crypto'
import { keychain } from '@libp2p/keychain'
import { MemoryDatastore } from 'datastore-core'

const kc = keychain({
  password: 'a password of at least 20 characters'
})({
  datastore: new MemoryDatastore(),
  getCrypto: defaultCryptoLoader()
})

await kc.importKey('imported', await generateKeyPair('Ed25519'))
await kc.renameKey('imported', 'renamed')
await kc.rotateKeychainPass('a new password of at least 20 characters')
await kc.removeKey('renamed')
```

## Configuring additional implementations

ECDSA, Ed25519 and RSA keys are supported out of the box but other schemes
are configurable by passing a `CryptoLoader` that can return `Crypto`
instances.

## Upgrading from 6.x

- The `pass` option is now `password`
- `dek.salt` and `dek.iterationCount` are now `salt` and `iterations`
- A customized `dek.keyLength` or `dek.hash` goes in `legacyDek: { keyLength, hash }` (defaults are `64` and `'sha2-512'`). It is only used to read keys written by 6.x
- A `getCrypto` component is required. libp2p passes `libp2p.getCrypto`, for standalone use pass `defaultCryptoLoader()` or `createCryptoLoader([...])` from `@libp2p/crypto`
- Stores written by 6.x are migrated the first time the keychain is used. The migration is resumable and `/keychain/meta` is written last. Once migrated a store cannot be opened by 6.x
- `findKeyById` and `findKeyByName` have been removed
- `listKeys()` is an async generator
- `importKey` returns the imported key and `removeKey` returns nothing
- `rotateKeychainPass(password)` takes only the new password and changes the password at runtime

# Install

```console
$ npm i @libp2p/keychain
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pKeychain` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/keychain/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_keychain.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/keychain/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/keychain/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
