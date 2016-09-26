# API

## `hmac`

Exposes an interface to the Keyed-Hash Message Authentication Code (HMAC) as defined in U.S. Federal Information Processing Standards Publication 198. An HMAC is a cryptographic hash that uses a key to sign a message. The receiver verifies the hash by recomputing it using the same key.

### `create(hash, secret, callback)`

- `hash: String`
- `secret: Buffer`
- `callback: Function`

#### `digest(data, callback)`

- `data: Buffer`
- `callback: Function`

## `aes`
Expoes an interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.

This uses `CTR` mode.

### `create(key, iv, callback)`

- `key: Buffer` The key, if length `16` then `AES 128` is used. For length `32`, `AES 256` is used.
- `iv: Buffer` Must have length `16`.
- `callback: Function`

#### `encrypt(data, callback)`

- `data: Buffer`
- `callback: Function`

#### `encrypt(data, callback)`

- `data: Buffer`
- `callback: Function`


## `webcrypto`

Depending on the environment this is either an instance of [node-webcrypto-ossl](https://github.com/PeculiarVentures/node-webcrypto-ossl) or the result of `window.crypto`.

## `keys`

## `generateKeyPair(type, bits, callback)`

- `type: String`, only `'RSA'` is currently supported
- `bits: Number` Minimum of 1024
- `callback: Function`

Generates a keypair of the given type and bitsize.

## `generateEphemeralKeyPair(curve, callback)`

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

## `keyStretcher(cipherType, hashType, secret, callback)`

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
## `marshalPublicKey(key[, type], callback)`

- `key: crypto.rsa.RsaPublicKey`
- `type: String`, only `'RSA'` is currently supported

Converts a public key object into a protobuf serialized public key.

## `unmarshalPublicKey(buf)`

- `buf: Buffer`

Converts a protobuf serialized public key into its  representative object.

## `marshalPrivateKey(key[, type])`

- `key: crypto.rsa.RsaPrivateKey`
- `type: String`, only `'RSA'` is currently supported

Converts a private key object into a protobuf serialized private key.

## `unmarshalPrivateKey(buf, callback)`

- `buf: Buffer`
- `callback: Function`

Converts a protobuf serialized private key into its representative object.
