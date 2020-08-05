# js-libp2p-crypto

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-crypto)
[![](https://img.shields.io/travis/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-crypto)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> Crypto primitives for libp2p in JavaScript

This repo contains the JavaScript implementation of the crypto primitives needed for libp2p. This is based on this [go implementation](https://github.com/libp2p/go-libp2p-crypto).

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun/)

## Table of Contents

- [js-libp2p-crypto](#js-libp2p-crypto)
  - [Lead Maintainer](#Lead-Maintainer)
  - [Table of Contents](#Table-of-Contents)
  - [Install](#Install)
  - [API](#API)
    - [`crypto.aes`](#cryptoaes)
      - [`crypto.aes.create(key, iv)`](#cryptoaescreatekey-iv)
        - [`decrypt(data)`](#decryptdata)
        - [`encrypt(data)`](#encryptdata)
    - [`crypto.hmac`](#cryptohmac)
      - [`crypto.hmac.create(hash, secret)`](#cryptohmaccreatehash-secret)
        - [`digest(data)`](#digestdata)
    - [`crypto.keys`](#cryptokeys)
    - [`crypto.keys.generateKeyPair(type, bits)`](#cryptokeysgenerateKeyPairtype-bits)
    - [`crypto.keys.generateEphemeralKeyPair(curve)`](#cryptokeysgenerateEphemeralKeyPaircurve)
    - [`crypto.keys.keyStretcher(cipherType, hashType, secret)`](#cryptokeyskeyStretchercipherType-hashType-secret)
    - [`crypto.keys.marshalPublicKey(key, [type])`](#cryptokeysmarshalPublicKeykey-type)
    - [`crypto.keys.unmarshalPublicKey(buf)`](#cryptokeysunmarshalPublicKeybuf)
    - [`crypto.keys.marshalPrivateKey(key, [type])`](#cryptokeysmarshalPrivateKeykey-type)
    - [`crypto.keys.unmarshalPrivateKey(buf)`](#cryptokeysunmarshalPrivateKeybuf)
    - [`crypto.keys.import(pem, password)`](#cryptokeysimportpem-password)
    - [`crypto.randomBytes(number)`](#cryptorandomBytesnumber)
    - [`crypto.pbkdf2(password, salt, iterations, keySize, hash)`](#cryptopbkdf2password-salt-iterations-keySize-hash)
  - [Contribute](#Contribute)
  - [License](#License)

## Install

```sh
npm install --save libp2p-crypto
```

## Usage

```js
const crypto = require('libp2p-crypto')

// Now available to you:
//
// crypto.aes
// crypto.hmac
// crypto.keys
// etc.
//
// See full API details below...
```

### Web Crypto API

The `libp2p-crypto` library depends on the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) in the browser. Web Crypto is available in all modern browsers, however browsers restrict its usage to [Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).

**This means you will not be able to use some `libp2p-crypto` functions in the browser when the page is served over HTTP.** To enable the Web Crypto API and allow `libp2p-crypto` to work fully, please serve your page over HTTPS.

## API

### `crypto.aes`

Exposes an interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.

This uses `CTR` mode.

#### `crypto.aes.create(key, iv)`

- `key: Buffer` The key, if length `16` then `AES 128` is used. For length `32`, `AES 256` is used.
- `iv: Buffer` Must have length `16`.

Returns `Promise<{decrypt<Function>, encrypt<Function>}>`

##### `decrypt(data)`

- `data: Buffer`

Returns `Promise<Buffer>`

##### `encrypt(data)`

- `data: Buffer`

Returns `Promise<Buffer>`

```js
const crypto = require('libp2p-crypto')

// Setting up Key and IV

// A 16 bytes array, 128 Bits, AES-128 is chosen
const key128 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

// A 16 bytes array, 128 Bits,
const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

async function main () {
  const decryptedMessage = 'Hello, world!'

  // Encrypting
  const cipher = await crypto.aes.create(key128, IV)
  const encryptedBuffer = await cipher.encrypt(Buffer.from(decryptedMessage))
  console.log(encryptedBuffer)
  // prints: <Buffer 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>

  // Decrypting
  const decipher = await crypto.aes.create(key128, IV)
  const decryptedBuffer = await cipher.decrypt(encryptedBuffer)

  console.log(decryptedBuffer)
  // prints: <Buffer 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>

  console.log(decryptedBuffer.toString('utf-8'))
  // prints: Hello, world!
}

main()
```

### `crypto.hmac`

Exposes an interface to the Keyed-Hash Message Authentication Code (HMAC) as defined in U.S. Federal Information Processing Standards Publication 198. An HMAC is a cryptographic hash that uses a key to sign a message. The receiver verifies the hash by recomputing it using the same key.

#### `crypto.hmac.create(hash, secret)`

- `hash: String`
- `secret: Buffer`

Returns `Promise<{digest<Function>}>`

##### `digest(data)`

- `data: Buffer`

Returns `Promise<Buffer>`

Example:

```js
const crypto = require('libp2p-crypto')

async function main () {
  const hash = 'SHA1' // 'SHA256' || 'SHA512'
  const hmac = await crypto.hmac.create(hash, Buffer.from('secret'))
  const sig = await hmac.digest(Buffer.from('hello world'))
  console.log(sig)
}

main()
```

### `crypto.keys`

**Supported Key Types**

The [`generateKeyPair`](#generatekeypairtype-bits), [`marshalPublicKey`](#marshalpublickeykey-type), and [`marshalPrivateKey`](#marshalprivatekeykey-type) functions accept a string `type` argument.

Currently the `'RSA'`, `'ed25519'`, and `secp256k1` types are supported, although ed25519 and secp256k1 keys support only signing and verification of messages.  For encryption / decryption support, RSA keys should be used.

### `crypto.keys.generateKeyPair(type, bits)`

- `type: String`, see [Supported Key Types](#supported-key-types) above.
- `bits: Number` Minimum of 1024

Returns `Promise<{privateKey<Buffer>, publicKey<Buffer>}>`

Generates a keypair of the given type and bitsize.

### `crypto.keys.generateEphemeralKeyPair(curve)`

- `curve: String`, one of `'P-256'`, `'P-384'`, `'P-521'` is currently supported

Returns `Promise`

Generates an ephemeral public key and returns a function that will compute the shared secret key.

Focuses only on ECDH now, but can be made more general in the future.

Resolves to an object of the form:

```js
{
  key: Buffer,
  genSharedKey: Function
}
```

### `crypto.keys.keyStretcher(cipherType, hashType, secret)`

- `cipherType: String`, one of `'AES-128'`, `'AES-256'`, `'Blowfish'`
- `hashType: String`, one of `'SHA1'`, `SHA256`, `SHA512`
- `secret: Buffer`

Returns `Promise`

Generates a set of keys for each party by stretching the shared key.

Resolves to an object of the form:

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

### `crypto.keys.marshalPublicKey(key, [type])`

- `key: keys.rsa.RsaPublicKey | keys.ed25519.Ed25519PublicKey | keys.secp256k1.Secp256k1PublicKey`
- `type: String`, see [Supported Key Types](#supported-key-types) above.  Defaults to 'rsa'.

Returns `Buffer`

Converts a public key object into a protobuf serialized public key.

### `crypto.keys.unmarshalPublicKey(buf)`

- `buf: Buffer`

Returns `RsaPublicKey|Ed25519PublicKey|Secp256k1PublicKey`

Converts a protobuf serialized public key into its representative object.

### `crypto.keys.marshalPrivateKey(key, [type])`

- `key: keys.rsa.RsaPrivateKey | keys.ed25519.Ed25519PrivateKey | keys.secp256k1.Secp256k1PrivateKey`
- `type: String`, see [Supported Key Types](#supported-key-types) above.

Returns `Buffer`

Converts a private key object into a protobuf serialized private key.

### `crypto.keys.unmarshalPrivateKey(buf)`

- `buf: Buffer`

Returns `Promise<RsaPrivateKey|Ed25519PrivateKey|Secp256k1PrivateKey>`

Converts a protobuf serialized private key into its representative object.

### `crypto.keys.import(encryptedKey, password)`

- `encryptedKey: string`
- `password: string`

Returns `Promise<PrivateKey>`

Converts an exported private key into its representative object. Supported formats are 'pem' (RSA only) and 'libp2p-key'.

### `privateKey.export(password, format)`

- `password: string`
- `format: string` the format to export to: 'pem' (rsa only), 'libp2p-key'

Returns `string`

Exports the password protected `PrivateKey`. RSA keys will be exported as password protected PEM by default. Ed25519 and Secp256k1 keys will be exported as password protected AES-GCM base64 encoded strings ('libp2p-key' format).

### `crypto.randomBytes(number)`

- `number: Number`

Returns `Buffer`

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
