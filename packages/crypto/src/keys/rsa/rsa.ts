import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { type Digest } from 'multiformats/hashes/digest'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { hashAndSign, utils, hashAndVerify } from './index.js'
import type { RSAPublicKey as RSAPublicKeyInterface, RSAPrivateKey as RSAPrivateKeyInterface } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export class RSAPublicKey implements RSAPublicKeyInterface {
  public readonly type = 'RSA'
  private readonly _key: JsonWebKey
  private _raw?: Uint8Array
  private readonly _multihash: Digest<18, number>

  constructor (key: JsonWebKey, digest: Digest<18, number>) {
    this._key = key
    this._multihash = digest
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = utils.jwkToPkix(this._key)
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

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean> {
    return hashAndVerify(this._key, sig, data)
  }
}

export class RSAPrivateKey implements RSAPrivateKeyInterface {
  public readonly type = 'RSA'
  private readonly _key: JsonWebKey
  private _raw?: Uint8Array
  public readonly publicKey: RSAPublicKey

  constructor (key: JsonWebKey, publicKey: RSAPublicKey) {
    this._key = key
    this.publicKey = publicKey
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = utils.jwkToPkcs1(this._key)
    }

    return this._raw
  }

  equals (key: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  sign (message: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array> {
    return hashAndSign(this._key, message)
  }
}
