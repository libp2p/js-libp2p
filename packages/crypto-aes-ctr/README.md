[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Streaming AES-CTR for node and browsers

# About

WebCrypto does not support streaming encryption - <https://github.com/w3c/webcrypto/issues/73>

In browsers this module uses `node-forge` to expose a streaming interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.

In node.js it uses the regular streaming API exported by the `crypto` module.

This uses `CTR` mode.

## Example

```js
import { create } from '@libp2p/crypto-aes-ctr'

// Setting up Key and IV

// A 16 bytes array, 128 Bits, AES-128 is chosen
const key128 = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

// A 16 bytes array, 128 Bits,
const IV = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

const decryptedMessage = 'Hello, world!'

// Encrypting
const cipher = await crypto.aes.create(key128, IV)
const encryptedBuffer = await encrypt(Uint8Array.from(decryptedMessage))
console.log(encryptedBuffer)
// prints: <Uint8Array 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>

// Decrypting
const decipher = await crypto.aes.create(key128, IV)
const decryptedBuffer = await decrypt(encryptedBuffer)

console.log(decryptedBuffer)
// prints: <Uint8Array 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>

console.log(decryptedBuffer.toString('utf-8'))
// prints: Hello, world!
```

# Install

```console
$ npm i @libp2p/crypto-aes-ctr
```

## Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pCryptoAesCtr` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/crypto-aes-ctr/dist/index.min.js"></script>
```

# API Docs

- <https://libp2p.github.io/js-libp2p/modules/_libp2p_crypto_aes_ctr.html>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
