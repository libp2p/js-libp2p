import { CodeError } from '@libp2p/interface'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isPromise } from '../util.js'
import { exporter } from './exporter.js'
import * as pbm from './keys.js'
import * as crypto from './rsa.js'
import type { PublicKey, PrivateKey } from '@libp2p/interface'
import type { Multibase } from 'multiformats'
import type { Uint8ArrayList } from 'uint8arraylist'

export const MAX_RSA_KEY_SIZE = 8192

export class RsaPublicKey implements PublicKey<'RSA'> {
  private readonly _key: JsonWebKey

  constructor (key: JsonWebKey) {
    this._key = key
  }

  verify (data: Uint8Array | Uint8ArrayList, sig: Uint8Array): boolean | Promise<boolean> {
    return crypto.hashAndVerify(this._key, sig, data)
  }

  marshal (): Uint8Array {
    return crypto.utils.jwkToPkix(this._key)
  }

  get bytes (): Uint8Array {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    }).subarray()
  }

  equals (key: any): boolean | boolean {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  hash (): Uint8Array | Promise<Uint8Array> {
    const p = sha256.digest(this.bytes)

    if (isPromise(p)) {
      return p.then(({ bytes }) => bytes)
    }

    return p.bytes
  }
}

export class RsaPrivateKey implements PrivateKey<'RSA'> {
  private readonly _key: JsonWebKey
  private readonly _publicKey: JsonWebKey

  constructor (key: JsonWebKey, publicKey: JsonWebKey) {
    this._key = key
    this._publicKey = publicKey
  }

  genSecret (): Uint8Array {
    return crypto.getRandomValues(16)
  }

  sign (message: Uint8Array | Uint8ArrayList): Uint8Array | Promise<Uint8Array> {
    return crypto.hashAndSign(this._key, message)
  }

  get public (): RsaPublicKey {
    if (this._publicKey == null) {
      throw new CodeError('public key not provided', 'ERR_PUBKEY_NOT_PROVIDED')
    }

    return new RsaPublicKey(this._publicKey)
  }

  marshal (): Uint8Array {
    return crypto.utils.jwkToPkcs1(this._key)
  }

  get bytes (): Uint8Array {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    }).subarray()
  }

  equals (key: any): boolean {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  hash (): Uint8Array | Promise<Uint8Array> {
    const p = sha256.digest(this.bytes)

    if (isPromise(p)) {
      return p.then(({ bytes }) => bytes)
    }

    return p.bytes
  }

  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   */
  async id (): Promise<string> {
    const hash = await this.public.hash()
    return uint8ArrayToString(hash, 'base58btc')
  }

  /**
   * Exports the key as libp2p-key - a aes-gcm encrypted value with the key
   * derived from the password.
   *
   * To export it as a password protected PEM file, please use the `exportPEM`
   * function from `@libp2p/rsa`.
   */
  async export (password: string, format = 'pkcs-8'): Promise<Multibase<'m'>> {
    if (format === 'pkcs-8') {
      return crypto.utils.exportToPem(this, password)
    } else if (format === 'libp2p-key') {
      return exporter(this.bytes, password)
    } else {
      throw new CodeError(`export format '${format}' is not supported`, 'ERR_INVALID_EXPORT_FORMAT')
    }
  }
}

export async function unmarshalRsaPrivateKey (bytes: Uint8Array): Promise<RsaPrivateKey> {
  const jwk = crypto.utils.pkcs1ToJwk(bytes)

  if (crypto.keySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new CodeError('key size is too large', 'ERR_KEY_SIZE_TOO_LARGE')
  }

  const keys = await crypto.unmarshalPrivateKey(jwk)

  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

export function unmarshalRsaPublicKey (bytes: Uint8Array): RsaPublicKey {
  const jwk = crypto.utils.pkixToJwk(bytes)

  if (crypto.keySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new CodeError('key size is too large', 'ERR_KEY_SIZE_TOO_LARGE')
  }

  return new RsaPublicKey(jwk)
}

export async function fromJwk (jwk: JsonWebKey): Promise<RsaPrivateKey> {
  if (crypto.keySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new CodeError('key size is too large', 'ERR_KEY_SIZE_TOO_LARGE')
  }

  const keys = await crypto.unmarshalPrivateKey(jwk)

  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

export async function generateKeyPair (bits: number): Promise<RsaPrivateKey> {
  if (bits > MAX_RSA_KEY_SIZE) {
    throw new CodeError('key size is too large', 'ERR_KEY_SIZE_TOO_LARGE')
  }

  const keys = await crypto.generateKey(bits)

  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}
