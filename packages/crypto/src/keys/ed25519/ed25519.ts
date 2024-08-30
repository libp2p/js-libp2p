import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { type Digest } from 'multiformats/hashes/digest'
import { identity } from 'multiformats/hashes/identity'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { publicKeyToProtobuf } from '../index.js'
import { ensureEd25519Key } from './utils.js'
import * as crypto from './index.js'
import type { Ed25519PublicKey as Ed25519PublicKeyInterface, Ed25519PrivateKey as Ed25519PrivateKeyInterface } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export class Ed25519PublicKey implements Ed25519PublicKeyInterface {
  public readonly type = 'Ed25519'
  public readonly raw: Uint8Array

  constructor (key: Uint8Array) {
    this.raw = ensureEd25519Key(key, crypto.publicKeyLength)
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

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean {
    return crypto.hashAndVerify(this.raw, sig, data)
  }
}

export class Ed25519PrivateKey implements Ed25519PrivateKeyInterface {
  public readonly type = 'Ed25519'
  public readonly raw: Uint8Array
  public readonly publicKey: Ed25519PublicKey

  // key       - 64 byte Uint8Array containing private key
  // publicKey - 32 byte Uint8Array containing public key
  constructor (key: Uint8Array, publicKey: Uint8Array) {
    this.raw = ensureEd25519Key(key, crypto.privateKeyLength)
    this.publicKey = new Ed25519PublicKey(publicKey)
  }

  equals (key?: any): boolean {
    if (key == null || !(key.raw instanceof Uint8Array)) {
      return false
    }

    return uint8ArrayEquals(this.raw, key.raw)
  }

  sign (message: Uint8Array | Uint8ArrayList): Uint8Array {
    return crypto.hashAndSign(this.raw, message)
  }
}
