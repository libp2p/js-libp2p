import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyToProtobuf } from '../index.js'
import { validateSecp256k1PublicKey, compressSecp256k1PublicKey, computeSecp256k1PublicKey, validateSecp256k1PrivateKey } from './utils.js'
import { hashAndVerify, hashAndSign } from './index.js'
import type { Secp256k1PublicKey as Secp256k1PublicKeyInterface, Secp256k1PrivateKey as Secp256k1PrivateKeyInterface } from '@libp2p/interface'
import type { Digest } from 'multiformats/hashes/digest'
import type { Uint8ArrayList } from 'uint8arraylist'

export class Secp256k1PublicKey implements Secp256k1PublicKeyInterface {
  public readonly type = 'secp256k1'
  public readonly raw: Uint8Array
  public readonly _key: Uint8Array

  constructor (key: Uint8Array) {
    this._key = validateSecp256k1PublicKey(key)
    this.raw = compressSecp256k1PublicKey(this._key)
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

  equals (key: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean {
    return hashAndVerify(this._key, sig, data)
  }
}

export class Secp256k1PrivateKey implements Secp256k1PrivateKeyInterface {
  public readonly type = 'secp256k1'
  public readonly raw: Uint8Array
  public readonly publicKey: Secp256k1PublicKey

  constructor (key: Uint8Array, publicKey?: Uint8Array) {
    this.raw = validateSecp256k1PrivateKey(key)
    this.publicKey = new Secp256k1PublicKey(publicKey ?? computeSecp256k1PublicKey(key))
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  sign (message: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array> {
    return hashAndSign(this.raw, message)
  }
}
