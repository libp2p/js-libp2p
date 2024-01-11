import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'

export type PeerIdType = 'RSA' | 'Ed25519' | 'secp256k1'

interface BasePeerId {
  readonly type: PeerIdType
  readonly multihash: MultihashDigest
  readonly privateKey?: Uint8Array
  readonly publicKey?: Uint8Array

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: PeerId | Uint8Array | string): boolean
}

export interface RSAPeerId extends BasePeerId {
  readonly type: 'RSA'
  readonly publicKey?: Uint8Array
}

export interface Ed25519PeerId extends BasePeerId {
  readonly type: 'Ed25519'
  readonly publicKey: Uint8Array
}

export interface Secp256k1PeerId extends BasePeerId {
  readonly type: 'secp256k1'
  readonly publicKey: Uint8Array
}

export type PeerId = RSAPeerId | Ed25519PeerId | Secp256k1PeerId

export const peerIdSymbol = Symbol.for('@libp2p/peer-id')

export function isPeerId (other: any): other is PeerId {
  return other != null && Boolean(other[peerIdSymbol])
}
