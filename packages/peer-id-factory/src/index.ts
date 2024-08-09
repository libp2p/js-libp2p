/**
 * @packageDocumentation
 *
 * Generate, import, and export PeerIDs.
 *
 * A Peer ID is the SHA-256 [multihash](https://github.com/multiformats/multihash) of a public key.
 *
 * The public key is a base64 encoded string of a protobuf containing an RSA DER buffer. This uses a node buffer to pass the base64 encoded public key protobuf to the multihash for ID generation.
 *
 * @example
 *
 * ```TypeScript
 * import { createEd25519PeerId } from '@libp2p/peer-id-factory'
 *
 * const peerId = await createEd25519PeerId()
 * console.log(peerId.toString())
 * ```
 *
 * ```bash
 * 12D3KooWRm8J3iL796zPFi2EtGGtUJn58AG67gcqzMFHZnnsTzqD
 * ```
 */

import { generateKeyPair, marshalPrivateKey, unmarshalPrivateKey, marshalPublicKey, unmarshalPublicKey } from '@libp2p/crypto/keys'
import { peerIdFromKeys, peerIdFromBytes } from '@libp2p/peer-id'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { PeerIdProto } from './proto.js'
import type { PublicKey, PrivateKey, RSAPeerId, Ed25519PeerId, Secp256k1PeerId, KeyType } from '@libp2p/interface'

export const createEd25519PeerId = async (): Promise<Ed25519PeerId> => {
  const key = await generateKeyPair('Ed25519')
  const id = await createFromPrivKey(key)

  if (id.type === 'Ed25519') {
    return id
  }

  throw new Error(`Generated unexpected PeerId type "${id.type}"`)
}

export const createSecp256k1PeerId = async (): Promise<Secp256k1PeerId> => {
  const key = await generateKeyPair('secp256k1')
  const id = await createFromPrivKey(key)

  if (id.type === 'secp256k1') {
    return id
  }

  throw new Error(`Generated unexpected PeerId type "${id.type}"`)
}

export const createRSAPeerId = async (opts?: { bits: number }): Promise<RSAPeerId> => {
  const key = await generateKeyPair('RSA', opts?.bits ?? 2048)
  const id = await createFromPrivKey(key)

  if (id.type === 'RSA') {
    return id
  }

  throw new Error(`Generated unexpected PeerId type "${id.type}"`)
}

export async function createFromPubKey <T extends KeyType > (publicKey: PublicKey<T>): Promise<Ed25519PeerId | Secp256k1PeerId | RSAPeerId> {
  return peerIdFromKeys(marshalPublicKey(publicKey))
}

export async function createFromPrivKey <T extends KeyType > (privateKey: PrivateKey<T>): Promise<Ed25519PeerId | Secp256k1PeerId | RSAPeerId> {
  return peerIdFromKeys(marshalPublicKey(privateKey.public), marshalPrivateKey(privateKey))
}

export function exportToProtobuf (peerId: RSAPeerId | Ed25519PeerId | Secp256k1PeerId, excludePrivateKey?: boolean): Uint8Array {
  return PeerIdProto.encode({
    id: peerId.multihash.bytes,
    pubKey: peerId.publicKey,
    privKey: excludePrivateKey === true || peerId.privateKey == null ? undefined : peerId.privateKey
  })
}

export async function createFromProtobuf (buf: Uint8Array): Promise<Ed25519PeerId | Secp256k1PeerId | RSAPeerId> {
  const {
    id,
    privKey,
    pubKey
  } = PeerIdProto.decode(buf)

  return createFromParts(
    id ?? new Uint8Array(0),
    privKey,
    pubKey
  )
}

export async function createFromJSON (obj: { id: string, privKey?: string, pubKey?: string }): Promise<Ed25519PeerId | Secp256k1PeerId | RSAPeerId> {
  return createFromParts(
    uint8ArrayFromString(obj.id, 'base58btc'),
    obj.privKey != null ? uint8ArrayFromString(obj.privKey, 'base64pad') : undefined,
    obj.pubKey != null ? uint8ArrayFromString(obj.pubKey, 'base64pad') : undefined
  )
}

async function createFromParts (multihash: Uint8Array, privKey?: Uint8Array, pubKey?: Uint8Array): Promise<Ed25519PeerId | Secp256k1PeerId | RSAPeerId> {
  if (privKey != null) {
    const key = await unmarshalPrivateKey(privKey)

    return createFromPrivKey(key)
  } else if (pubKey != null) {
    const key = unmarshalPublicKey(pubKey)

    return createFromPubKey(key)
  }

  const peerId = peerIdFromBytes(multihash)

  if (peerId.type !== 'Ed25519' && peerId.type !== 'secp256k1' && peerId.type !== 'RSA') {
    // should not be possible since `multihash` is derived from keys and these
    // are the cryptographic peer id types
    throw new Error('Supplied PeerID is invalid')
  }

  return peerId
}
