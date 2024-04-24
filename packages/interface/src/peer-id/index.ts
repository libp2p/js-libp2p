import type { KeyType } from '../keys/index.js'
import type { CID } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'

export type PeerIdType = KeyType | string

export interface RSAPeerId extends PeerId {
  readonly type: 'RSA'
  readonly publicKey?: Uint8Array
}

export interface Ed25519PeerId extends PeerId {
  readonly type: 'Ed25519'
  readonly publicKey: Uint8Array
}

export interface Secp256k1PeerId extends PeerId {
  readonly type: 'secp256k1'
  readonly publicKey: Uint8Array
}

export interface PeerId {
  type: PeerIdType
  multihash: MultihashDigest
  privateKey?: Uint8Array
  publicKey?: Uint8Array

  toString(): string
  toCID(): CID
  toBytes(): Uint8Array
  equals(other?: PeerId | Uint8Array | string): boolean
}

export const peerIdSymbol = Symbol.for('@libp2p/peer-id')

export function isPeerId (other: any): other is PeerId {
  return other != null && Boolean(other[peerIdSymbol])
}
