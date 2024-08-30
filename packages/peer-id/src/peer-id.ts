/**
 * @packageDocumentation
 *
 * An implementation of a peer id
 *
 * @example
 *
 * ```TypeScript
 * import { peerIdFromString } from '@libp2p/peer-id'
 * const peer = peerIdFromString('k51qzi5uqu5dkwkqm42v9j9kqcam2jiuvloi16g72i4i4amoo2m8u3ol3mqu6s')
 *
 * console.log(peer.toCID()) // CID(bafzaa...)
 * console.log(peer.toString()) // "12D3K..."
 * ```
 */

import { peerIdSymbol } from '@libp2p/interface'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Ed25519PeerId as Ed25519PeerIdInterface, PeerIdType, RSAPeerId as RSAPeerIdInterface, URLPeerId as URLPeerIdInterface, Secp256k1PeerId as Secp256k1PeerIdInterface, PeerId, PublicKey, Ed25519PublicKey, Secp256k1PublicKey, RSAPublicKey } from '@libp2p/interface'
import type { MultihashDigest } from 'multiformats/hashes/interface'

const inspect = Symbol.for('nodejs.util.inspect.custom')

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const LIBP2P_KEY_CODE = 0x72

interface PeerIdInit <DigestCode extends number> {
  type: PeerIdType
  multihash: MultihashDigest<DigestCode>
}

interface RSAPeerIdInit {
  multihash: MultihashDigest<0x12>
  publicKey?: RSAPublicKey
}

interface Ed25519PeerIdInit {
  multihash: MultihashDigest<0x0>
  publicKey: Ed25519PublicKey
}

interface Secp256k1PeerIdInit {
  multihash: MultihashDigest<0x0>
  publicKey: Secp256k1PublicKey
}

class PeerIdImpl <DigestCode extends number> {
  public type: PeerIdType
  private readonly multihash: MultihashDigest<DigestCode>
  public readonly publicKey?: PublicKey
  private string?: string

  constructor (init: PeerIdInit<DigestCode>) {
    this.type = init.type
    this.multihash = init.multihash

    // mark string cache as non-enumerable
    Object.defineProperty(this, 'string', {
      enumerable: false,
      writable: true
    })
  }

  get [Symbol.toStringTag] (): string {
    return `PeerId(${this.toString()})`
  }

  readonly [peerIdSymbol] = true

  toString (): string {
    if (this.string == null) {
      this.string = base58btc.encode(this.multihash.bytes).slice(1)
    }

    return this.string
  }

  toMultihash (): MultihashDigest<DigestCode> {
    return this.multihash
  }

  // return self-describing String representation
  // in default format from RFC 0001: https://github.com/libp2p/specs/pull/209
  toCID (): CID<Uint8Array, 0x72, DigestCode, 1> {
    return CID.createV1(LIBP2P_KEY_CODE, this.multihash)
  }

  toJSON (): string {
    return this.toString()
  }

  /**
   * Checks the equality of `this` peer against a given PeerId
   */
  equals (id?: PeerId | Uint8Array | string): boolean {
    if (id == null) {
      return false
    }

    if (id instanceof Uint8Array) {
      return uint8ArrayEquals(this.multihash.bytes, id)
    } else if (typeof id === 'string') {
      return this.toString() === id
    } else if (id?.toMultihash()?.bytes != null) {
      return uint8ArrayEquals(this.multihash.bytes, id.toMultihash().bytes)
    } else {
      throw new Error('not valid Id')
    }
  }

  /**
   * Returns PeerId as a human-readable string
   * https://nodejs.org/api/util.html#utilinspectcustom
   *
   * @example
   * ```TypeScript
   * import { peerIdFromString } from '@libp2p/peer-id'
   *
   * console.info(peerIdFromString('QmFoo'))
   * // 'PeerId(QmFoo)'
   * ```
   */
  [inspect] (): string {
    return `PeerId(${this.toString()})`
  }
}

export class RSAPeerId extends PeerIdImpl<0x12> implements RSAPeerIdInterface {
  public readonly type = 'RSA'
  public readonly publicKey?: RSAPublicKey

  constructor (init: RSAPeerIdInit) {
    super({ ...init, type: 'RSA' })

    this.publicKey = init.publicKey
  }
}

export class Ed25519PeerId extends PeerIdImpl<0x0> implements Ed25519PeerIdInterface {
  public readonly type = 'Ed25519'
  public readonly publicKey: Ed25519PublicKey

  constructor (init: Ed25519PeerIdInit) {
    super({ ...init, type: 'Ed25519' })

    this.publicKey = init.publicKey
  }
}

export class Secp256k1PeerId extends PeerIdImpl<0x0> implements Secp256k1PeerIdInterface {
  public readonly type = 'secp256k1'
  public readonly publicKey: Secp256k1PublicKey

  constructor (init: Secp256k1PeerIdInit) {
    super({ ...init, type: 'secp256k1' })

    this.publicKey = init.publicKey
  }
}

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const TRANSPORT_IPFS_GATEWAY_HTTP_CODE = 0x0920

export class URLPeerId implements URLPeerIdInterface {
  readonly type = 'url'
  readonly multihash: MultihashDigest<0x0>
  readonly publicKey: undefined
  readonly url: string

  constructor (url: URL) {
    this.url = url.toString()
    this.multihash = identity.digest(uint8ArrayFromString(this.url))
  }

  [inspect] (): string {
    return `PeerId(${this.url})`
  }

  readonly [peerIdSymbol] = true

  toString (): string {
    return this.toCID().toString()
  }

  toMultihash (): MultihashDigest<0x0> {
    return this.multihash
  }

  toCID (): CID<Uint8Array, 0x0920, 0x0, 1> {
    return CID.createV1(TRANSPORT_IPFS_GATEWAY_HTTP_CODE, this.toMultihash())
  }

  toJSON (): string {
    return this.toString()
  }

  equals (other?: PeerId | Uint8Array | string): boolean {
    if (other == null) {
      return false
    }

    if (other instanceof Uint8Array) {
      other = uint8ArrayToString(other)
    }

    return other.toString() === this.toString()
  }
}
