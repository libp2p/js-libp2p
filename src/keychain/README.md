# js-libp2p-keychain

> A secure key chain for libp2p in JavaScript

## Features

- Manages the lifecycle of a key
- Keys are encrypted at rest
- Enforces the use of safe key names
- Uses encrypted PKCS 8 for key storage
- Uses PBKDF2 for a "stetched" key encryption key
- Enforces NIST SP 800-131A and NIST SP 800-132
- Uses PKCS 7: CMS (aka RFC 5652) to provide cryptographically protected messages
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

The actual physical storage of an encrypted key is left to implementations of [interface-datastore](https://github.com/ipfs/interface-datastore/).  A key benifit is that now the key chain can be used in browser with the [js-datastore-level](https://github.com/ipfs/js-datastore-level) implementation.

### Cryptographic Message Syntax (CMS)

CMS, aka [PKCS #7](https://en.wikipedia.org/wiki/PKCS) and [RFC 5652](https://tools.ietf.org/html/rfc5652), describes an encapsulation syntax for data protection. It is used to digitally sign, digest, authenticate, or encrypt arbitrary message content. Basically, `cms.encrypt` creates a DER message that can be only be read by someone holding the private key.
