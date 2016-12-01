# js-libp2p-crypto

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-crypto/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-crypto?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-crypto.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-crypto)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-crypto.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-crypto)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/ipfs-js-libp2p-crypto.svg)](https://saucelabs.com/u/ipfs-js-
libp2p-crypto)

> Crypto primitives for libp2p in JavaScript

This repo contains the JavaScript implementation of the crypto primitives
needed for libp2p. This is based on this [go implementation](https://github.com/libp2p/go-libp2p-crypto).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Example](#example)
- [API](#api)
  - [`hmac`](#hmac)
    - [`create(hash, secret, callback)`](#createhash-secret-callback)
      - [`digest(data, callback)`](#digestdata-callback)
  - [`aes`](#aes)
    - [`create(key, iv, callback)`](#createkey-iv-callback)
      - [`encrypt(data, callback)`](#encryptdata-callback)
      - [`encrypt(data, callback)`](#encryptdata-callback)
  - [`webcrypto`](#webcrypto)
  - [`keys`](#keys)
  - [`generateKeyPair(type, bits, callback)`](#generatekeypairtype-bits-callback)
  - [`generateEphemeralKeyPair(curve, callback)`](#generateephemeralkeypaircurve-callback)
  - [`keyStretcher(cipherType, hashType, secret, callback)`](#keystretcherciphertype-hashtype-secret-callback)
  - [`marshalPublicKey(key[, type], callback)`](#marshalpublickeykey-type-callback)
  - [`unmarshalPublicKey(buf)`](#unmarshalpublickeybuf)
  - [`marshalPrivateKey(key[, type])`](#marshalprivatekeykey-type)
  - [`unmarshalPrivateKey(buf, callback)`](#unmarshalprivatekeybuf-callback)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
npm install --save libp2p-crypto
```

## Usage

### Example

```js
const crypto = require('libp2p-crypto')

crypto.generateKeyPair('RSA', 2048, (err, key) => {
})
```

## API

### `hmac`

Exposes an interface to the Keyed-Hash Message Authentication Code (HMAC) as defined in U.S. Federal Information Processing Standards Publication 198. An HMAC is a cryptographic hash that uses a key to sign a message. The receiver verifies the hash by recomputing it using the same key.

#### `create(hash, secret, callback)`

- `hash: String`
- `secret: Buffer`
- `callback: Function`

##### `digest(data, callback)`

- `data: Buffer`
- `callback: Function`

### `aes`
Expoes an interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.

This uses `CTR` mode.

#### `create(key, iv, callback)`

- `key: Buffer` The key, if length `16` then `AES 128` is used. For length `32`, `AES 256` is used.
- `iv: Buffer` Must have length `16`.
- `callback: Function`

##### `encrypt(data, callback)`

- `data: Buffer`
- `callback: Function`

##### `encrypt(data, callback)`

- `data: Buffer`
- `callback: Function`


### `webcrypto`

Depending on the environment this is either an instance of [node-webcrypto-ossl](https://github.com/PeculiarVentures/node-webcrypto-ossl) or the result of `window.crypto`.

### `keys`

### `generateKeyPair(type, bits, callback)`

- `type: String`, only `'RSA'` is currently supported
- `bits: Number` Minimum of 1024
- `callback: Function`

Generates a keypair of the given type and bitsize.

### `generateEphemeralKeyPair(curve, callback)`

- `curve: String`, one of `'P-256'`, `'P-384'`, `'P-521'` is currently supported
- `callback: Function`

Generates an ephemeral public key and returns a function that will compute the shared secret key.

Focuses only on ECDH now, but can be made more general in the future.

Calls back with an object of the form

```js
{
  key: Buffer,
  genSharedKey: Function
}
```

### `keyStretcher(cipherType, hashType, secret, callback)`

- `cipherType: String`, one of `'AES-128'`, `'AES-256'`, `'Blowfish'`
- `hashType: String`, one of `'SHA1'`, `SHA256`, `SHA512`
- `secret: Buffer`
- `callback: Function`

Generates a set of keys for each party by stretching the shared key.

Calls back with an object of the form
```js
{
  k1: {
    iv: Buffer,
    cipherKey: Buffer,
    macKey: Buffer
  },
  k2: {
    iv: Buffer,
    cipherKey: Buffer,
    macKey: Buffer
  }
}
```

### `marshalPublicKey(key[, type], callback)`

- `key: crypto.rsa.RsaPublicKey`
- `type: String`, only `'RSA'` is currently supported

Converts a public key object into a protobuf serialized public key.

### `unmarshalPublicKey(buf)`

- `buf: Buffer`

Converts a protobuf serialized public key into its  representative object.

### `marshalPrivateKey(key[, type])`

- `key: crypto.rsa.RsaPrivateKey`
- `type: String`, only `'RSA'` is currently supported

Converts a private key object into a protobuf serialized private key.

### `unmarshalPrivateKey(buf, callback)`

- `buf: Buffer`
- `callback: Function`

Converts a protobuf serialized private key into its representative object.

### `randomBytes(number)`

- `number: Number`

Generates a Buffer with length `number` populated by random bytes.

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-crypto/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
