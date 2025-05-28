import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { hashAndSign, utils, hashAndVerify } from './index.js'
import type { RSAPublicKey as RSAPublicKeyInterface, RSAPrivateKey as RSAPrivateKeyInterface, AbortOptions } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'
import type { Uint8ArrayList } from 'uint8arraylist'

export class RSAPublicKey implements RSAPublicKeyInterface {
  public readonly type = 'RSA'
  public readonly jwk: JsonWebKey
  private _raw?: Uint8Array
  private readonly _multihash: Digest<18, number>

  constructor (jwk: JsonWebKey, digest: Digest<18, number>) {
    this.jwk = jwk
    this._multihash = digest
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = utils.jwkToPkix(this.jwk)
    }

    return this._raw
  }

  toMultihash (): Digest<18, number> {
    return this._multihash
  }

  toCID (): CID<unknown, 114, 18, 1> {
    return CID.createV1(114, this._multihash)
  }

  toString (): string {
    return base58btc.encode(this.toMultihash().bytes).substring(1)
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): boolean | Promise<boolean> {
    return hashAndVerify(this.jwk, sig, data, options)
  }
}

export class RSAPrivateKey implements RSAPrivateKeyInterface {
  public readonly type = 'RSA'
  public readonly jwk: JsonWebKey
  private _raw?: Uint8Array
  public readonly publicKey: RSAPublicKey

  constructor (jwk: JsonWebKey, publicKey: RSAPublicKey) {
    this.jwk = jwk
    this.publicKey = publicKey
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = utils.jwkToPkcs1(this.jwk)
    }

    return this._raw
  }

  equals (key: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  sign (message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array | Promise<Uint8Array> {
    return hashAndSign(this.jwk, message, options)
  }
}
