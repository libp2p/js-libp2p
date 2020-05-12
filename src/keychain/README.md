# js-libp2p-keychain

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-keychain.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-keychain)
[![](https://img.shields.io/travis/libp2p/js-libp2p-keychain.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-keychain)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-keychain.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-keychain)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> A secure key chain for libp2p in JavaScript

## Lead Maintainer

[Vasco Santos](https://github.com/vasco-santos).

## Features

- Manages the lifecycle of a key
- Keys are encrypted at rest
- Enforces the use of safe key names
- Uses encrypted PKCS 8 for key storage
- Uses PBKDF2 for a "stetched" key encryption key
- Enforces NIST SP 800-131A and NIST SP 800-132
- Uses PKCS 7: CMS (aka RFC 5652) to provide cryptographically protected messages
- Delays reporting errors to slow down brute force attacks

## Table of Contents

## Install

```sh
npm install --save libp2p-keychain
```

### Usage

```js
const Keychain = require('libp2p-keychain')
const FsStore = require('datastore-fs')

const datastore = new FsStore('./a-keystore')
const opts = {
  passPhrase: 'some long easily remembered phrase'
}
const keychain = new Keychain(datastore, opts)
```

## API

Managing a key

- `async createKey (name, type, size)`
- `async renameKey (oldName, newName)`
- `async removeKey (name)`
- `async exportKey (name, password)`
- `async importKey (name, pem, password)`
- `async importPeer (name, peer)`

A naming service for a key

- `async listKeys ()`
- `async findKeyById (id)`
- `async findKeyByName (name)`

Cryptographically protected messages

- `async cms.encrypt (name, plain)`
- `async cms.decrypt (cmsData)`

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

The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).  A key benifit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.

### Cryptographic Message Syntax (CMS)

CMS, aka [PKCS #7](https://en.wikipedia.org/wiki/PKCS) and [RFC 5652](https://tools.ietf.org/html/rfc5652), describes an encapsulation syntax for data protection. It is used to digitally sign, digest, authenticate, or encrypt arbitrary message content. Basically, `cms.encrypt` creates a DER message that can be only be read by someone holding the private key.

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-keychain/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

## License

[MIT](LICENSE)
