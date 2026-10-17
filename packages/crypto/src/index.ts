/**
 * @packageDocumentation
 *
 * WebCrypto-based implementations of ECDSA, Ed25519, and RSA cryptography.
 *
 * ## Removed exports
 *
 * - `@libp2p/crypto/keys`, `/hmac`, `/ciphers` and `/webcrypto`, `pbkdf2`, `randomBytes`, `keyStretcher` and ECDH have been removed
 * - `.raw` and `.equals` on keys have been removed, as have `publicKeyFromRaw` and `privateKeyFromRaw`
 * - `publicKeyToProtobuf(key)` and `privateKeyToProtobuf(key)` are now `key.toProtobuf()`
 * - `publicKeyFromProtobuf` and `privateKeyFromProtobuf` are now async
 * - `generateKeyPair(type, { bits, curve, getCrypto })` is async and picks the implementation from the crypto loader
 * - Use `publicKeyForPeer(peerId)` to get a public key from a `PeerId`. Since `peerId.publicKey` is the protobuf-encoded key, you can also call `publicKeyFromProtobuf(peerId.publicKey)`
 * - Use `createCryptoLoader()` and the per-type factories `ed25519Crypto()`, `rsaCrypto()` and `ecdsaCrypto()` to configure which key types are available
 *
 * ## secp256k1
 *
 * Ed25519, RSA and ECDSA are enabled by default. secp256k1 is opt-in:
 *
 * ```ts
 * import { createLibp2p } from 'libp2p'
 * import { secp256k1Crypto } from '@libp2p/crypto/secp256k1'
 *
 * const node = await createLibp2p({
 *   cryptos: [secp256k1Crypto()]
 * })
 * ```
 *
 * Without it a node cannot complete handshakes with peers that use secp256k1
 * identities and cannot verify their identify or pubsub keys (gossipsub drops
 * their messages without penalizing the relaying peers). Keychain secp256k1 keys
 * are migrated but cannot be exported until it is configured.
 */

export { ecdsaCrypto } from './ecdsa.ts'
export { ed25519Crypto } from './ed25519.ts'
export { rsaCrypto } from './rsa.ts'
export { createCryptoLoader, defaultCryptoLoader } from './loader.ts'
export { publicKeyFromProtobuf, privateKeyFromProtobuf, generateKeyPair } from './dispatch.ts'
export type { CryptoLoaderOptions } from './dispatch.ts'
export { publicKeyForPeer } from './public-key-for-peer.ts'
export { UnknownCryptoError } from './errors.ts'

export type { PublicKey, PrivateKey, Crypto, CryptoLoader, KeyType } from '@libp2p/interface'
export { isPublicKey, isPrivateKey } from '@libp2p/interface'
