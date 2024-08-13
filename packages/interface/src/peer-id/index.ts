import type { KeyType } from '../keys/index.js'
import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'

export type PeerIdType = KeyType | string

/**
 * A PeerId generated from an RSA private key.
 *
 * The PeerId is a base58btc encoded sha-256 hash of the private key.
 *
 * RSA public keys are too large to pass around freely, instead Ed25519 or
 * secp256k1 should be preferred as they can embed their public key in the
 * PeerId itself.
 *
 * @deprecated Ed25519 or secp256k1 keys are preferred to RSA
 */
export interface RSAPeerId {
  readonly type: 'RSA'
  readonly publicKey?: Uint8Array
  readonly multihash: MultihashDigest

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: any): boolean
}

export interface Ed25519PeerId {
  readonly type: 'Ed25519'
  readonly publicKey: Uint8Array
  readonly multihash: MultihashDigest

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: any): boolean
}

export interface Secp256k1PeerId {
  readonly type: 'secp256k1'
  readonly publicKey: Uint8Array
  readonly multihash: MultihashDigest

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: any): boolean
}

export interface URLPeerId {
  readonly type: 'url'
  readonly multihash: MultihashDigest
  readonly publicKey: undefined

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: any): boolean
}

export type PeerId = RSAPeerId | Ed25519PeerId | Secp256k1PeerId | URLPeerId

export const peerIdSymbol = Symbol.for('@libp2p/peer-id')

export function isPeerId (other?: any): other is PeerId {
  return Boolean(other?.[peerIdSymbol])
}
