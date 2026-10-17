/**
 * @packageDocumentation
 *
 * WebCrypto-based implementations of ECDSA, Ed25519, and RSA cryptography.
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
