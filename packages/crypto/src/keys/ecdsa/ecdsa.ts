import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyToProtobuf } from '../index.js'
import { privateKeyToPKIMessage, publicKeyToPKIMessage } from './utils.js'
import { hashAndVerify, hashAndSign } from './index.js'
import type { ECDSAPublicKey as ECDSAPublicKeyInterface, ECDSAPrivateKey as ECDSAPrivateKeyInterface, AbortOptions } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'
import type { Uint8ArrayList } from 'uint8arraylist'

export class ECDSAPublicKey implements ECDSAPublicKeyInterface {
  public readonly type = 'ECDSA'
  public readonly jwk: JsonWebKey
  private _raw?: Uint8Array

  constructor (jwk: JsonWebKey) {
    this.jwk = jwk
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = publicKeyToPKIMessage(this.jwk)
    }

    return this._raw
  }

  toMultihash (): Digest<0x0, number> {
    return identity.digest(publicKeyToProtobuf(this))
  }

  toCID (): CID<unknown, 114, 0x0, 1> {
    return CID.createV1(114, this.toMultihash())
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

  async verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array, options?: AbortOptions): Promise<boolean> {
    return hashAndVerify(this.jwk, sig, data, options)
  }
}

export class ECDSAPrivateKey implements ECDSAPrivateKeyInterface {
  public readonly type = 'ECDSA'
  public readonly jwk: JsonWebKey
  public readonly publicKey: ECDSAPublicKey
  private _raw?: Uint8Array

  constructor (jwk: JsonWebKey) {
    this.jwk = jwk
    this.publicKey = new ECDSAPublicKey({
      crv: jwk.crv,
      ext: jwk.ext,
      key_ops: ['verify'],
      kty: 'EC',
      x: jwk.x,
      y: jwk.y
    })
  }

  get raw (): Uint8Array {
    if (this._raw == null) {
      this._raw = privateKeyToPKIMessage(this.jwk)
    }

    return this._raw
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  async sign (message: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<Uint8Array> {
    return hashAndSign(this.jwk, message, options)
  }
}
