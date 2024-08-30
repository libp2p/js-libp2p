import type { Ed25519PublicKey, KeyType, RSAPublicKey, Secp256k1PublicKey } from '../keys/index.js'
import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'

export type PeerIdType = KeyType | string

/**
 * A PeerId generated from an RSA public key - it is a base58btc encoded sha-256
 * hash of the public key.
 *
 * RSA public keys are too large to pass around freely, instead Ed25519 or
 * secp256k1 should be preferred as they can embed their public key in the
 * PeerId itself.
 *
 * @deprecated Ed25519 or secp256k1 keys are preferred to RSA
 */
export interface RSAPeerId {
  readonly type: 'RSA'

  /**
   * RSA public keys are too large to embed in the multihash commonly used to
   * refer to peers, so this will only be defined if the public key has
   * previously been found through a routing query or during normal protocol
   * operations
   */
  readonly publicKey?: RSAPublicKey

  /**
   * Returns the multihash from `toMultihash()` as a base58btc encoded string
   */
  toString(): string

  /**
   * Returns a multihash, the digest of which is the SHA2-256 hash of the public
   * key
   */
  toMultihash(): MultihashDigest<0x12>

  /**
   * Returns a CID with the libp2p key code and the same multihash as
   * `toMultihash()`
   */
  toCID(): CID<Uint8Array, 0x72, 0x12, 1>

  /**
   * Returns true if the passed argument is equivalent to this PeerId
   */
  equals(other?: any): boolean
}

export interface Ed25519PeerId {
  readonly type: 'Ed25519'

  /**
   * This will always be defined as the public key is embedded in the multihash
   * of this PeerId
   */
  readonly publicKey: Ed25519PublicKey

  /**
   * Returns the multihash from `toMultihash()` as a base58btc encoded string
   */
  toString(): string

  /**
   * Returns a multihash, the digest of which is the protobuf-encoded public key
   * encoded as an identity hash
   */
  toMultihash(): MultihashDigest<0x0>

  /**
   * Returns a CID with the libp2p key code and the same multihash as
   * `toMultihash()`
   */
  toCID(): CID<Uint8Array, 0x72, 0x0, 1>

  /**
   * Returns true if the passed argument is equivalent to this PeerId
   */
  equals(other?: any): boolean
}

export interface Secp256k1PeerId {
  readonly type: 'secp256k1'

  /**
   * This will always be defined as the public key is embedded in the multihash
   * of this PeerId
   */
  readonly publicKey: Secp256k1PublicKey

  /**
   * Returns the multihash from `toMultihash()` as a base58btc encoded string
   */
  toString(): string

  /**
   * Returns a multihash, the digest of which is the protobuf-encoded public key
   * encoded as an identity hash
   */
  toMultihash(): MultihashDigest<0x0>

  /**
   * Returns a CID with the libp2p key code and the same multihash as
   * `toMultihash()`
   */
  toCID(): CID<Uint8Array, 0x72, 0x0, 1>

  /**
   * Returns true if the passed argument is equivalent to this PeerId
   */
  equals(other?: any): boolean
}

export interface URLPeerId {
  readonly type: 'url'

  /**
   * This will always be undefined as URL Peers do not have public keys
   */
  readonly publicKey: undefined

  /**
   * Returns CID from `toCID()` encoded as a base36 string
   */
  toString(): string

  /**
   * Returns a multihash, the digest of which is the URL encoded as an identity
   * hash
   */
  toMultihash(): MultihashDigest<0x0>

  /**
   * Returns a CID with the Transport IPFS Gateway HTTP code and the same
   * multihash as `toMultihash()`
   */
  toCID(): CID<Uint8Array, 0x0920, 0x0, 1>

  /**
   * Returns true if the passed argument is equivalent to this PeerId
   */
  equals(other?: any): boolean
}

/**
 * This is a union of all known PeerId types - use the `.type` field to
 * disambiguate them
 */
export type PeerId = RSAPeerId | Ed25519PeerId | Secp256k1PeerId | URLPeerId

/**
 * All PeerId implementations must use this symbol as the name of a property
 * with a boolean `true` value
 */
export const peerIdSymbol = Symbol.for('@libp2p/peer-id')

/**
 * Returns true if the passed argument is a PeerId implementation
 */
export function isPeerId (other?: any): other is PeerId {
  return Boolean(other?.[peerIdSymbol])
}
