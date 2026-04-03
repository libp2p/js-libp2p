import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { hashAndSign, hashAndVerify } from './index.js'
import type { MLDSAPublicKey as MLDSAPublicKeyInterface, MLDSAPrivateKey as MLDSAPrivateKeyInterface, MLDSAVariant, AbortOptions } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'
import type { Uint8ArrayList } from 'uint8arraylist'

export class MLDSAPublicKey implements MLDSAPublicKeyInterface {
  public readonly type = 'MLDSA'
  public readonly variant: MLDSAVariant
  public readonly raw: Uint8Array
  private readonly digest: Digest<0x12, number>
  private string?: string

  constructor (variant: MLDSAVariant, key: Uint8Array, digest: Digest<0x12, number>) {
    this.variant = variant
    this.raw = key
    this.digest = digest
  }

  toMultihash (): Digest<0x12, number> {
    return this.digest
  }

  toCID (): CID<unknown, 114, 0x12, 1> {
    return CID.createV1(114, this.toMultihash())
  }

  toString (): string {
    if (this.string == null) {
      this.string = base58btc.encode(this.toMultihash().bytes).substring(1)
    }

    return this.string
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array) || key.variant !== this.variant) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): boolean {
    return hashAndVerify(this.variant, this.raw, sig, data, options)
  }
}

export class MLDSAPrivateKey implements MLDSAPrivateKeyInterface {
  public readonly type = 'MLDSA'
  public readonly variant: MLDSAVariant
  public readonly raw: Uint8Array
  public readonly publicKey: MLDSAPublicKey

  constructor (variant: MLDSAVariant, key: Uint8Array, publicKey: MLDSAPublicKey) {
    this.variant = variant
    this.raw = key
    this.publicKey = publicKey
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array) || key.variant !== this.variant) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  sign (message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array {
    return hashAndSign(this.variant, this.raw, message, options)
  }
}
