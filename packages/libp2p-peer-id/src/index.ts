import { type Ed25519PeerId, type PeerIdType, type RSAPeerId, type Secp256k1PeerId, symbol, type PeerId } from '@libp2p/interface-peer-id'
import { CodeError } from '@libp2p/interfaces/errors'
import { base58btc } from 'multiformats/bases/base58'
import { bases } from 'multiformats/basics'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { identity } from 'multiformats/hashes/identity'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import type { MultibaseDecoder } from 'multiformats/bases/interface'
import type { MultihashDigest } from 'multiformats/hashes/interface'

const inspect = Symbol.for('nodejs.util.inspect.custom')

const baseDecoder = Object
  .values(bases)
  .map(codec => codec.decoder)
  // @ts-expect-error https://github.com/multiformats/js-multiformats/issues/141
  .reduce((acc, curr) => acc.or(curr), bases.identity.decoder)

// these values are from https://github.com/multiformats/multicodec/blob/master/table.csv
const LIBP2P_KEY_CODE = 0x72

const MARSHALLED_ED225519_PUBLIC_KEY_LENGTH = 36
const MARSHALLED_SECP256K1_PUBLIC_KEY_LENGTH = 37

interface PeerIdInit {
  type: PeerIdType
  multihash: MultihashDigest
  privateKey?: Uint8Array
}

interface RSAPeerIdInit {
  multihash: MultihashDigest
  privateKey?: Uint8Array
  publicKey?: Uint8Array
}

interface Ed25519PeerIdInit {
  multihash: MultihashDigest
  privateKey?: Uint8Array
}

interface Secp256k1PeerIdInit {
  multihash: MultihashDigest
  privateKey?: Uint8Array
}

class PeerIdImpl {
  public type: PeerIdType
  public readonly multihash: MultihashDigest
  public readonly privateKey?: Uint8Array
  public readonly publicKey?: Uint8Array
  private string?: string

  constructor (init: PeerIdInit) {
    this.type = init.type
    this.multihash = init.multihash
    this.privateKey = init.privateKey

    // mark string cache as non-enumerable
    Object.defineProperty(this, 'string', {
      enumerable: false,
      writable: true
    })
  }

  get [Symbol.toStringTag] (): string {
    return `PeerId(${this.toString()})`
  }

  readonly [symbol] = true

  toString (): string {
    if (this.string == null) {
      this.string = base58btc.encode(this.multihash.bytes).slice(1)
    }

    return this.string
  }

  // return self-describing String representation
  // in default format from RFC 0001: https://github.com/libp2p/specs/pull/209
  toCID (): CID {
    return CID.createV1(LIBP2P_KEY_CODE, this.multihash)
  }

  toBytes (): Uint8Array {
    return this.multihash.bytes
  }

  /**
   * Returns Multiaddr as a JSON string
   */
  toJSON (): string {
    return this.toString()
  }

  /**
   * Checks the equality of `this` peer against a given PeerId
   */
  equals (id: PeerId | Uint8Array | string): boolean {
    if (id instanceof Uint8Array) {
      return uint8ArrayEquals(this.multihash.bytes, id)
    } else if (typeof id === 'string') {
      return peerIdFromString(id).equals(this as PeerId)
    } else if (id?.multihash?.bytes != null) {
      return uint8ArrayEquals(this.multihash.bytes, id.multihash.bytes)
    } else {
      throw new Error('not valid Id')
    }
  }

  /**
   * Returns PeerId as a human-readable string
   * https://nodejs.org/api/util.html#utilinspectcustom
   *
   * @example
   * ```js
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

class RSAPeerIdImpl extends PeerIdImpl implements RSAPeerId {
  public readonly type = 'RSA'
  public readonly publicKey?: Uint8Array

  constructor (init: RSAPeerIdInit) {
    super({ ...init, type: 'RSA' })

    this.publicKey = init.publicKey
  }
}

class Ed25519PeerIdImpl extends PeerIdImpl implements Ed25519PeerId {
  public readonly type = 'Ed25519'
  public readonly publicKey: Uint8Array

  constructor (init: Ed25519PeerIdInit) {
    super({ ...init, type: 'Ed25519' })

    this.publicKey = init.multihash.digest
  }
}

class Secp256k1PeerIdImpl extends PeerIdImpl implements Secp256k1PeerId {
  public readonly type = 'secp256k1'
  public readonly publicKey: Uint8Array

  constructor (init: Secp256k1PeerIdInit) {
    super({ ...init, type: 'secp256k1' })

    this.publicKey = init.multihash.digest
  }
}

export function createPeerId (init: PeerIdInit): PeerId {
  if (init.type === 'RSA') {
    return new RSAPeerIdImpl(init)
  }

  if (init.type === 'Ed25519') {
    return new Ed25519PeerIdImpl(init)
  }

  if (init.type === 'secp256k1') {
    return new Secp256k1PeerIdImpl(init)
  }

  throw new CodeError('Type must be "RSA", "Ed25519" or "secp256k1"', 'ERR_INVALID_PARAMETERS')
}

export function peerIdFromPeerId (other: any): PeerId {
  if (other.type === 'RSA') {
    return new RSAPeerIdImpl(other)
  }

  if (other.type === 'Ed25519') {
    return new Ed25519PeerIdImpl(other)
  }

  if (other.type === 'secp256k1') {
    return new Secp256k1PeerIdImpl(other)
  }

  throw new CodeError('Not a PeerId', 'ERR_INVALID_PARAMETERS')
}

export function peerIdFromString (str: string, decoder?: MultibaseDecoder<any>): PeerId {
  decoder = decoder ?? baseDecoder

  if (str.charAt(0) === '1' || str.charAt(0) === 'Q') {
    // identity hash ed25519/secp256k1 key or sha2-256 hash of
    // rsa public key - base58btc encoded either way
    const multihash = Digest.decode(base58btc.decode(`z${str}`))

    if (str.startsWith('12D')) {
      return new Ed25519PeerIdImpl({ multihash })
    } else if (str.startsWith('16U')) {
      return new Secp256k1PeerIdImpl({ multihash })
    } else {
      return new RSAPeerIdImpl({ multihash })
    }
  }

  return peerIdFromBytes(baseDecoder.decode(str))
}

export function peerIdFromBytes (buf: Uint8Array): PeerId {
  try {
    const multihash = Digest.decode(buf)

    if (multihash.code === identity.code) {
      if (multihash.digest.length === MARSHALLED_ED225519_PUBLIC_KEY_LENGTH) {
        return new Ed25519PeerIdImpl({ multihash })
      } else if (multihash.digest.length === MARSHALLED_SECP256K1_PUBLIC_KEY_LENGTH) {
        return new Secp256k1PeerIdImpl({ multihash })
      }
    }

    if (multihash.code === sha256.code) {
      return new RSAPeerIdImpl({ multihash })
    }
  } catch {
    return peerIdFromCID(CID.decode(buf))
  }

  throw new Error('Supplied PeerID CID is invalid')
}

export function peerIdFromCID (cid: CID): PeerId {
  if (cid == null || cid.multihash == null || cid.version == null || (cid.version === 1 && cid.code !== LIBP2P_KEY_CODE)) {
    throw new Error('Supplied PeerID CID is invalid')
  }

  const multihash = cid.multihash

  if (multihash.code === sha256.code) {
    return new RSAPeerIdImpl({ multihash: cid.multihash })
  } else if (multihash.code === identity.code) {
    if (multihash.digest.length === MARSHALLED_ED225519_PUBLIC_KEY_LENGTH) {
      return new Ed25519PeerIdImpl({ multihash: cid.multihash })
    } else if (multihash.digest.length === MARSHALLED_SECP256K1_PUBLIC_KEY_LENGTH) {
      return new Secp256k1PeerIdImpl({ multihash: cid.multihash })
    }
  }

  throw new Error('Supplied PeerID CID is invalid')
}

/**
 * @param publicKey - A marshalled public key
 * @param privateKey - A marshalled private key
 */
export async function peerIdFromKeys (publicKey: Uint8Array, privateKey?: Uint8Array): Promise<PeerId> {
  if (publicKey.length === MARSHALLED_ED225519_PUBLIC_KEY_LENGTH) {
    return new Ed25519PeerIdImpl({ multihash: Digest.create(identity.code, publicKey), privateKey })
  }

  if (publicKey.length === MARSHALLED_SECP256K1_PUBLIC_KEY_LENGTH) {
    return new Secp256k1PeerIdImpl({ multihash: Digest.create(identity.code, publicKey), privateKey })
  }

  return new RSAPeerIdImpl({ multihash: await sha256.digest(publicKey), publicKey, privateKey })
}
