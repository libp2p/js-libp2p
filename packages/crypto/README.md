# @libp2p/crypto

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Crypto primitives for libp2p

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

WebCrypto-based implementations of ECDSA, Ed25519, and RSA cryptography.

## Removed exports

- `@libp2p/crypto/keys`, `/hmac`, `/ciphers` and `/webcrypto`, `pbkdf2`, `randomBytes`, `keyStretcher` and ECDH have been removed
- `.raw` and `.equals` on keys have been removed, as have `publicKeyFromRaw` and `privateKeyFromRaw`
- `publicKeyToProtobuf(key)` and `privateKeyToProtobuf(key)` are now `key.toProtobuf()`
- `publicKeyFromProtobuf` and `privateKeyFromProtobuf` are now async
- `generateKeyPair(type, { bits, curve, getCrypto })` is async and picks the implementation from the crypto loader
- Use `publicKeyForPeer(peerId)` to get a public key from a `PeerId`. Since `peerId.publicKey` is the protobuf-encoded key, you can also call `publicKeyFromProtobuf(peerId.publicKey)`
- Use `createCryptoLoader()` and the per-type factories `ed25519Crypto()`, `rsaCrypto()` and `ecdsaCrypto()` to configure which key types are available

## secp256k1

Ed25519, RSA and ECDSA are enabled by default. secp256k1 is opt-in:

```ts
import { createLibp2p } from 'libp2p'
import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'

const node = await createLibp2p({
  cryptos: [secp256k1Crypto()]
})
```

Without it a node cannot complete handshakes with peers that use secp256k1
identities and cannot verify their identify or pubsub keys (gossipsub drops
their messages without penalizing the relaying peers). Keychain secp256k1 keys
are migrated but cannot be exported until it is configured.

# Install

```console
$ npm i @libp2p/crypto
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `Libp2pCrypto` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/crypto/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_crypto.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
