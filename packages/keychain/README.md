# @libp2p/keychain

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Key management and cryptographically protected messages

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

- Manages the life cycle of a key
- Keys are encrypted at rest
- Enforces the use of safe key names
- Uses encrypted PKCS 8 for key storage
- Uses PBKDF2 for a "stretched" key encryption key
- Enforces NIST SP 800-131A and NIST SP 800-132
- Delays reporting errors to slow down brute force attacks

## KeyInfo

The key management and naming service API all return a `KeyInfo` object.  The `id` is a universally unique identifier for the key.  The `name` is local to the key chain.

```JSON
{
  "name": "rsa-key",
  "id": "QmYWYSUZ4PV6MRFYpdtEDJBiGs4UrmE6g8wmAWSePekXVW"
}
```

The **key id** is the SHA-256 [multihash](https://github.com/multiformats/multihash) of its public key.

The *public key* is a [protobuf encoding](https://github.com/libp2p/js-libp2p/blob/main/packages/crypto/src/keys/keys.proto.js) containing a type and the [DER encoding](https://en.wikipedia.org/wiki/X.690) of the PKCS [SubjectPublicKeyInfo](https://www.ietf.org/rfc/rfc3279.txt).

## Private key storage

A private key is stored as an encrypted PKCS 8 structure in the PEM format. It is protected by a key generated from the key chain's *pass phrase* using **PBKDF2**.

The default options for generating the derived encryption key are in the `dek` object.  This, along with the pass phrase, is the input to a `PBKDF2` function.

```TypeScript
const defaultOptions = {
  // See https://cryptosense.com/parameter-choice-for-pbkdf2/
  dek: {
    keyLength: 512 / 8,
    iterationCount: 1000,
    salt: 'at least 16 characters long',
    hash: 'sha2-512'
  }
}
```

![key storage](https://github.com/libp2p/js-libp2p/blob/main/doc/private-key.png?raw=true)

## Physical storage

The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).

A key benefit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.

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
