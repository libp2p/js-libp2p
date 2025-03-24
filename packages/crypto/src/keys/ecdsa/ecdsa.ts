import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyToProtobuf } from '../index.js'
import { privateKeyToPKIMessage, publicKeyToPKIMessage } from './utils.js'
import { hashAndVerify, hashAndSign } from './index.js'
import type { ECDSAPublicKey as ECDSAPublicKeyInterface, ECDSAPrivateKey as ECDSAPrivateKeyInterface } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'
import type { Uint8ArrayList } from 'uint8arraylist'

export class ECDSAPublicKey implements ECDSAPublicKeyInterface {
  public readonly type = 'ECDSA'
  public readonly raw: Uint8Array
  private readonly _key: JsonWebKey

  constructor (publicKey: JsonWebKey) {
    this._key = publicKey
    this.raw = publicKeyToPKIMessage(publicKey)
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

  async verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array): Promise<boolean> {
    return hashAndVerify(this._key, sig, data)
  }
}

export class ECDSAPrivateKey implements ECDSAPrivateKeyInterface {
  public readonly type = 'ECDSA'
  public readonly raw: Uint8Array
  private readonly _key: JsonWebKey
  public readonly publicKey: ECDSAPublicKey

  constructor (privateKey: JsonWebKey, publicKey: JsonWebKey) {
    this._key = privateKey
    this.raw = privateKeyToPKIMessage(privateKey)
    this.publicKey = new ECDSAPublicKey(publicKey)
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  async sign (message: Uint8Array | Uint8ArrayList): Promise<Uint8Array> {
    return hashAndSign(this._key, message)
  }
}
