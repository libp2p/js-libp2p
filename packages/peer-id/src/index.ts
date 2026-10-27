/**
 * @packageDocumentation
 *
 * An implementation of a peer id
 *
 * `peerId.publicKey` is the protobuf-encoded public key as bytes. To get a key
 * object use `publicKeyFromProtobuf(peerId.publicKey)` or
 * `publicKeyForPeer(peerId)` from `@libp2p/crypto`.
 *
 * @example
 *
 * ```TypeScript
 * import { peerIdFromString } from '@libp2p/peer-id'
 * const peer = peerIdFromString('12D3KooWKnDdG3iXw9eTFijk3EWSunZcFi54Zka4wmtqtt6rPxc8')
 *
 * console.log(peer.toCID()) // CID(bafzaa...)
 * console.log(peer.toString()) // "12D3K..."
 * ```
 */

import { InvalidCIDError, InvalidPublicKeyError, InvalidMultihashError, InvalidParametersError, UnsupportedKeyTypeError } from '@libp2p/interface'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { identity } from 'multiformats/hashes/identity'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { decodePublicKeyHeader } from './key.ts'
import { RSAPeerId as RSAPeerIdClass, Ed25519PeerId as Ed25519PeerIdClass, Secp256k1PeerId as Secp256k1PeerIdClass, URLPeerId as URLPeerIdClass } from './peer-id.ts'
import type { Ed25519PeerId, RSAPeerId, URLPeerId, Secp256k1PeerId, PeerId, PublicKey, PrivateKey } from '@libp2p/interface'
import type { MultibaseDecoder } from 'multiformats/cid'
import type { MultihashDigest } from 'multiformats/hashes/interface'

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const ED25519 = 1
const SECP256K1 = 2
const LIBP2P_KEY_CODE = 0x72
const TRANSPORT_IPFS_GATEWAY_HTTP_CODE = 0x0920

export function peerIdFromString (str: string, decoder?: MultibaseDecoder<any>): Ed25519PeerId | Secp256k1PeerId | RSAPeerId | URLPeerId {
  let multihash: MultihashDigest

  if (str.charAt(0) === '1' || str.charAt(0) === 'Q') {
    // identity hash ed25519/secp256k1 key or sha2-256 hash of
    // rsa public key - base58btc encoded either way
    multihash = Digest.decode(base58btc.decode(`z${str}`))
  } else if (str.startsWith('k51qzi5uqu5') || str.startsWith('kzwfwjn5ji4') || str.startsWith('k2k4r8') || str.startsWith('bafz')) {
    // base36 encoded CIDv1 with libp2p-key and identity hash (for ed25519/secp256k1/rsa) or base32 encoded CIDv1 with libp2p-key and identity hash (for ed25519/secp256k1/rsa)
    return peerIdFromCID(CID.parse(str))
  } else {
    if (decoder == null) {
      throw new InvalidParametersError('Please pass a multibase decoder for strings that do not start with "1" or "Q"')
    }

    multihash = Digest.decode(decoder.decode(str))
  }

  return peerIdFromMultihash(multihash)
}

export function peerIdFromPublicKey (publicKey: PublicKey): PeerId {
  if (publicKey.type !== 'Ed25519' && publicKey.type !== 'secp256k1' && publicKey.type !== 'RSA') {
    throw new UnsupportedKeyTypeError()
  }

  return peerIdFromMultihash(publicKey.toMultihash(), publicKey.toProtobuf())
}

export function peerIdFromPrivateKey (privateKey: PrivateKey): PeerId {
  return peerIdFromPublicKey(privateKey.publicKey)
}

export function peerIdFromMultihash (multihash: MultihashDigest, publicKey?: Uint8Array): PeerId {
  if (isSha256Multihash(multihash)) {
    return new RSAPeerIdClass({ multihash, publicKey })
  }

  if (isIdentityMultihash(multihash)) {
    if (publicKey != null && !uint8ArrayEquals(publicKey, multihash.digest)) {
      throw new InvalidPublicKeyError('Public key does not match peer id')
    }

    const key = decodePublicKeyHeader(multihash.digest)

    if (key == null) {
      return new URLPeerIdClass(new URL(uint8ArrayToString(multihash.digest)))
    }

    if (key.type === ED25519 && key.data.byteLength === 32) {
      return new Ed25519PeerIdClass({ multihash, publicKey: multihash.digest })
    }

    if (key.type === SECP256K1 && (key.data.byteLength === 33 || key.data.byteLength === 65)) {
      return new Secp256k1PeerIdClass({ multihash, publicKey: multihash.digest })
    }
  }

  throw new InvalidMultihashError('Supplied PeerID Multihash is invalid')
}

export function peerIdFromCID (cid: CID): Ed25519PeerId | Secp256k1PeerId | RSAPeerId | URLPeerId {
  if (cid?.multihash == null || cid.version == null || (cid.version === 1 && (cid.code !== LIBP2P_KEY_CODE) && cid.code !== TRANSPORT_IPFS_GATEWAY_HTTP_CODE)) {
    throw new InvalidCIDError('Supplied PeerID CID is invalid')
  }

  if (cid.code === TRANSPORT_IPFS_GATEWAY_HTTP_CODE) {
    const url = uint8ArrayToString(cid.multihash.digest)

    return new URLPeerIdClass(new URL(url))
  }

  return peerIdFromMultihash(cid.multihash)
}

function isIdentityMultihash (multihash: MultihashDigest): multihash is MultihashDigest<0x0> {
  return multihash.code === identity.code
}

function isSha256Multihash (multihash: MultihashDigest): multihash is MultihashDigest<0x12> {
  return multihash.code === sha256.code
}
