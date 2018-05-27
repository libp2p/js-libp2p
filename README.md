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
![](https://img.shields.io/badge/Node.js-%3E%3D6.0.0-orange.svg?style=flat-square)

> Crypto primitives for libp2p in JavaScript

This repo contains the JavaScript implementation of the crypto primitives needed for libp2p. This is based on this [go implementation](https://github.com/libp2p/go-libp2p-crypto).

## Lead Maintainer

[Friedel Ziegelmayer](https://github.com/dignifiedquire/)

## Table of Contents

- [Install](#install)
- [API](#api)
  - [`crypto.hmac`](#hmac)
    - [`create(hash, secret, callback)`](#createhash-secret-callback)
      - [`digest(data, callback)`](#digestdata-callback)
  - [`crypto.aes`](#aes)
    - [`create(key, iv, callback)`](#createkey-iv-callback)
      - [`encrypt(data, callback)`](#encryptdata-callback)
      - [`decrypt(data, callback)`](#decryptdata-callback)
  - [`keys`](#keys)
    - [`generateKeyPair(type, bits, callback)`](#generatekeypairtype-bits-callback)
    - [`generateEphemeralKeyPair(curve, callback)`](#generateephemeralkeypaircurve-callback)
    - [`keyStretcher(cipherType, hashType, secret, callback)`](#keystretcherciphertype-hashtype-secret-callback)
    - [`marshalPublicKey(key[, type], callback)`](#marshalpublickeykey-type-callback)
    - [`unmarshalPublicKey(buf)`](#unmarshalpublickeybuf)
    - [`marshalPrivateKey(key[, type])`](#marshalprivatekeykey-type)
    - [`unmarshalPrivateKey(buf, callback)`](#unmarshalprivatekeybuf-callback)
    - [`import(pem, password, callback)`](#importpem-password-callback)
  - [`webcrypto`](#webcrypto)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
npm install --save libp2p-crypto
```

## API

### `crypto.aes`

Expoes an interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.

This uses `CTR` mode.

#### `crypto.aes.create(key, iv, callback)`

- `key: Buffer` The key, if length `16` then `AES 128` is used. For length `32`, `AES 256` is used.
- `iv: Buffer` Must have length `16`.
- `callback: Function` 

##### `decrypt(data, callback)`

- `data: Buffer`
- `callback: Function`

##### `encrypt(data, callback)`

- `data: Buffer`
- `callback: Function`

```js
var crypto = require('libp2p-crypto')

// Setting up Key and IV

// A 16 bytes array, 128 Bits, AES-128 is chosen
var key128 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

// A 16 bytes array, 128 Bits,
var IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

async function main () {
  let decryptedMessage = 'Hello, world!'
  let encryptedMessage

  // Encrypting
  await crypto.aes.create(key128, IV, (err, cipher) => {
    if (!err) {
      cipher.encrypt(Buffer.from(decryptedMessage), (err, encryptedBuffer) => {
        if (!err) {
          console.log(encryptedBuffer)
          // prints: <Buffer 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>
          encryptedMessage = encryptedBuffer
        }
      })
    }
  })

  // Decrypting
  await crypto.aes.create(key128, IV, (err, cipher) => {
    if (!err) {
      cipher.decrypt(encryptedMessage, (err, decryptedBuffer) => {
        if (!err) {
          console.log(decryptedBuffer)
          // prints: <Buffer 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>
          
          console.log(decryptedBuffer.toString('utf-8'))
          // prints: Hello, world!
        }
      })
    }
  })
}
main()

```

### `crypto.hmac`

Exposes an interface to the Keyed-Hash Message Authentication Code (HMAC) as defined in U.S. Federal Information Processing Standards Publication 198. An HMAC is a cryptographic hash that uses a key to sign a message. The receiver verifies the hash by recomputing it using the same key.

#### `crypto.hmac.create(hash, secret, callback)`

- `hash: String`
- `secret: Buffer`
- `callback: Function`

##### `digest(data, callback)`

- `data: Buffer`
- `callback: Function`

Example:

```js
var crypto = require('libp2p-crypto')

let hash = 'SHA1' // 'SHA256' || 'SHA512'

crypto.hmac.create(hash, Buffer.from('secret'), (err, hmac) => {
  if (!err) {
    hmac.digest(Buffer.from('hello world'), (err, sig) => {
      if (!err) {
        console.log(sig)
      }
    })
  }
})
```

### `crypto.keys`

**Supported Key Types**

The [`generateKeyPair`](#generatekeypairtype-bits-callback), [`marshalPublicKey`](#marshalpublickeykey-type-callback), and [`marshalPrivateKey`](#marshalprivatekeykey-type) functions accept a string `type` argument.

Currently the `'RSA'` and `'ed25519'` types are supported, although ed25519 keys support only signing and verification of messages.  For encryption / decryption support, RSA keys should be used.

Installing the [libp2p-crypto-secp256k1](https://github.com/libp2p/js-libp2p-crypto-secp256k1) module adds support for the `'secp256k1'` type, which supports ECDSA signatures using the secp256k1 elliptic curve popularized by Bitcoin.  This module is not installed by default, and should be explicitly depended on if your project requires secp256k1 support.

### `crypto.keys.generateKeyPair(type, bits, callback)`

- `type: String`, see [Supported Key Types](#supported-key-types) above.
- `bits: Number` Minimum of 1024
- `callback: Function`

Generates a keypair of the given type and bitsize.

### `crypto.keys.generateEphemeralKeyPair(curve, callback)`

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

### `crypto.keys.keyStretcher(cipherType, hashType, secret, callback)`

- `cipherType: String`, one of `'AES-128'`, `'AES-256'`, `'Blowfish'`
- `hashType: String`, one of `'SHA1'`, `SHA256`, `SHA512`
- `secret: Buffer`
- `callback: Function`

Generates a set of keys for each party by stretching the shared key.

Calls back with an object of the form:

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

### `crypto.keys.marshalPublicKey(key[, type], callback)`

- `key: keys.rsa.RsaPublicKey | keys.ed25519.Ed25519PublicKey | require('libp2p-crypto-secp256k1').Secp256k1PublicKey`
- `type: String`, see [Supported Key Types](#supported-key-types) above.

Converts a public key object into a protobuf serialized public key.

### `crypto.keys.unmarshalPublicKey(buf)`

- `buf: Buffer`

Converts a protobuf serialized public key into its  representative object.

### `crypto.keys.marshalPrivateKey(key[, type])`

- `key: keys.rsa.RsaPrivateKey | keys.ed25519.Ed25519PrivateKey | require('libp2p-crypto-secp256k1').Secp256k1PrivateKey`
- `type: String`, see [Supported Key Types](#supported-key-types) above.

Converts a private key object into a protobuf serialized private key.

### `crypto.keys.unmarshalPrivateKey(buf, callback)`

- `buf: Buffer`
- `callback: Function`

Converts a protobuf serialized private key into its representative object.

### `crypto.keys.import(pem, password, callback)`

- `pem: string`
- `password: string`
- `callback: Function`

Converts a PEM password protected private key into its representative object.

### `crypto.randomBytes(number)`

- `number: Number`

Generates a Buffer with length `number` populated by random bytes.

### `crypto.pbkdf2(password, salt, iterations, keySize, hash)`

- `password: String`
- `salt: String`
- `iterations: Number`
- `keySize: Number` in bytes
- `hash: String` the hashing algorithm ('sha1', 'sha2-512', ...)

Computes the Password Based Key Derivation Function 2; returning a new password.

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-crypto/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](./LICENSE)
