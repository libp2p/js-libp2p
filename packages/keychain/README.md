# @libp2p/keychain <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-keychain.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-keychain)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p-keychain/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/libp2p/js-libp2p-keychain/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Key management and cryptographically protected messages

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Features](#features)
  - [KeyInfo](#keyinfo)
  - [Private key storage](#private-key-storage)
  - [Physical storage](#physical-storage)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i @libp2p/keychain
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `Libp2pKeychain` in the global namespace.

```html
<script src="https://unpkg.com/@libp2p/keychain/dist/index.min.js"></script>
```

## Features

- Manages the lifecycle of a key
- Keys are encrypted at rest
- Enforces the use of safe key names
- Uses encrypted PKCS 8 for key storage
- Uses PBKDF2 for a "stetched" key encryption key
- Enforces NIST SP 800-131A and NIST SP 800-132
- Delays reporting errors to slow down brute force attacks

### KeyInfo

The key management and naming service API all return a `KeyInfo` object.  The `id` is a universally unique identifier for the key.  The `name` is local to the key chain.

```js
{
  name: 'rsa-key',
  id: 'QmYWYSUZ4PV6MRFYpdtEDJBiGs4UrmE6g8wmAWSePekXVW'
}
```

The **key id** is the SHA-256 [multihash](https://github.com/multiformats/multihash) of its public key. The *public key* is a [protobuf encoding](https://github.com/libp2p/js-libp2p-crypto/blob/master/src/keys/keys.proto.js) containing a type and the [DER encoding](https://en.wikipedia.org/wiki/X.690) of the PKCS [SubjectPublicKeyInfo](https://www.ietf.org/rfc/rfc3279.txt).

### Private key storage

A private key is stored as an encrypted PKCS 8 structure in the PEM format. It is protected by a key generated from the key chain's *passPhrase* using **PBKDF2**.

The default options for generating the derived encryption key are in the `dek` object.  This, along with the passPhrase, is the input to a `PBKDF2` function.

```js
const defaultOptions = {
  //See https://cryptosense.com/parameter-choice-for-pbkdf2/
  dek: {
    keyLength: 512 / 8,
    iterationCount: 1000,
    salt: 'at least 16 characters long',
    hash: 'sha2-512'
  }
}
```

![key storage](./doc/private-key.png?raw=true)

### Physical storage

The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).  A key benefit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.

## API Docs

- <https://libp2p.github.io/js-libp2p-keychain>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
