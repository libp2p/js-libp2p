# js-libp2p-crypto

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D4.0.0-orange.svg?style=flat-square)

> Support for secp256k1 keys in js-libp2p-crypto

This repo contains a [js-libp2p-crypto](https://github.com/libp2p/js-libp2p-crypto)-compatible 
implementation of cryptographic signature generation and verification using the 
[secp256k1 elliptic curve](https://en.bitcoin.it/wiki/Secp256k1) popularized by Bitcoin and other 
crypto currencies.  

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Example](#example)
- [API](#api)
  - [`generateKeyPair([bits,] callback)`](#generatekeypairbits-callback)
  - [`unmarshalSecp256k1PublicKey(bytes)`](#unmarshalsecp256k1publickeybytes)
  - [`unmarshalSecp256k1PrivateKey(bytes, callback)`](#unmarshalsecp256k1privatekeybytes-callback)
  - [`Secp256k1PublicKey`](#secp256k1publickey)
    - [`.verify(data, sig, callback)`](#verifydata-sig-callback)
  - [`Secp256k1PrivateKey`](#secp256k1privatekey)
    - [`.public`](#public)
    - [`.sign(data, callback)`](#signdata-callback)
- [Contribute](#contribute)
- [License](#license)

## Install

```sh
npm install --save libp2p-crypto-secp256k1
```

## Usage

This module is designed to work with [js-libp2p-crypto](https://github.com/libp2p/js-libp2p-crypto).  
Installing `libp2p-crypto-secp256k1` will automatically add support for the `'secp256k1'` key type, which
can be used as an argument to the [libp2p-crypto API functions](https://github.com/libp2p/js-libp2p-crypto#api)
`generateKeyPair`, `unmarshalPublicKey`, and `marshalPrivateKey`.  The keys returned from those functions will be
instances of the `Secp256k1PublicKey` or `Secp256k1PrivateKey` classes provided by this module.

### Example

```js
const crypto = require('libp2p-crypto')

const msg = Buffer.from('Hello World')

crypto.generateKeyPair('secp256k1', 256, (err, key) => {
  // assuming no error, key will be an instance of Secp256k1PrivateKey
  // the public key is available as key.public
  key.sign(msg, (err, sig) => {
    key.public.verify(msg, sig, (err, valid) => {
      assert(valid, 'Something went horribly wrong')
    })
  })
})
```

## API

The functions below are the public API of this module.
For usage within libp2p-crypto, see the [libp2p-crypto API documentation](https://github.com/libp2p/js-libp2p-crypto#api).

### `generateKeyPair([bits, ] callback)`
- `bits: Number` - Optional, included for compatibility with js-libp2p-crypto. Ignored if present; private keys will always be 256 bits.
- `callback: Function`

### `unmarshalSecp256k1PublicKey(bytes)`
- `bytes: Buffer`

Converts a serialized secp256k1 public key into an instance of `Secp256k1PublicKey` and returns it

### `unmarshalSecp256k1PrivateKey(bytes, callback)`
- `bytes: Buffer`
- `callback: Function`

Converts a serialized secp256k1 private key into an instance of `Secp256k1PrivateKey`, passing it to `callback` on success

### `Secp256k1PublicKey`

#### `.verify(data, sig, callback)`
- `data: Buffer`
- `sig: Buffer`
- `callback: Function`

Calculates the SHA-256 hash of `data`, and verifies the DER-encoded signature in `sig`, passing the result to `callback`

### `Secp256k1PrivateKey`

#### `.public`

Accessor for the `Secp256k1PublicKey` associated with this private key.

#### `.sign(data, callback)`
- `data: Buffer`

Calculates the SHA-256 hash of `data` and signs it, passing the DER-encoded signature to `callback`

## Contribute

Feel free to join in. All welcome. Open an [issue](https://github.com/libp2p/js-libp2p-crypto/issues)!

This repository falls under the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/contributing.md)

## License

[MIT](LICENSE)
