import { CodeError } from '@libp2p/interfaces/errors'
import { base58btc } from 'multiformats/bases/base58'
import { identity } from 'multiformats/hashes/identity'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import * as crypto from './ed25519.js'
import { exporter } from './exporter.js'
import * as pbm from './keys.js'
import type { Multibase } from 'multiformats'

export class Ed25519PublicKey {
  private readonly _key: Uint8Array

  constructor (key: Uint8Array) {
    this._key = ensureKey(key, crypto.publicKeyLength)
  }

  async verify (data: Uint8Array, sig: Uint8Array): Promise<boolean> { // eslint-disable-line require-await
    return crypto.hashAndVerify(this._key, sig, data)
  }

  marshal (): Uint8Array {
    return this._key
  }

  get bytes (): Uint8Array {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.Ed25519,
      Data: this.marshal()
    }).subarray()
  }

  equals (key: any): boolean {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash (): Promise<Uint8Array> {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }
}

export class Ed25519PrivateKey {
  private readonly _key: Uint8Array
  private readonly _publicKey: Uint8Array

  // key       - 64 byte Uint8Array containing private key
  // publicKey - 32 byte Uint8Array containing public key
  constructor (key: Uint8Array, publicKey: Uint8Array) {
    this._key = ensureKey(key, crypto.privateKeyLength)
    this._publicKey = ensureKey(publicKey, crypto.publicKeyLength)
  }

  async sign (message: Uint8Array): Promise<Uint8Array> { // eslint-disable-line require-await
    return crypto.hashAndSign(this._key, message)
  }

  get public (): Ed25519PublicKey {
    return new Ed25519PublicKey(this._publicKey)
  }

  marshal (): Uint8Array {
    return this._key
  }

  get bytes (): Uint8Array {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.Ed25519,
      Data: this.marshal()
    }).subarray()
  }

  equals (key: any): boolean {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash (): Promise<Uint8Array> {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }

  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the identity multihash containing its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   *
   * @returns {Promise<string>}
   */
  async id (): Promise<string> {
    const encoding = identity.digest(this.public.bytes)
    return base58btc.encode(encoding.bytes).substring(1)
  }

  /**
   * Exports the key into a password protected `format`
   */
  async export (password: string, format = 'libp2p-key'): Promise<Multibase<'m'>> {
    if (format === 'libp2p-key') {
      return exporter(this.bytes, password)
    } else {
      throw new CodeError(`export format '${format}' is not supported`, 'ERR_INVALID_EXPORT_FORMAT')
    }
  }
}

export function unmarshalEd25519PrivateKey (bytes: Uint8Array): Ed25519PrivateKey {
  // Try the old, redundant public key version
  if (bytes.length > crypto.privateKeyLength) {
    bytes = ensureKey(bytes, crypto.privateKeyLength + crypto.publicKeyLength)
    const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength)
    const publicKeyBytes = bytes.subarray(crypto.privateKeyLength, bytes.length)
    return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes)
  }

  bytes = ensureKey(bytes, crypto.privateKeyLength)
  const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength)
  const publicKeyBytes = bytes.subarray(crypto.publicKeyLength)
  return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes)
}

export function unmarshalEd25519PublicKey (bytes: Uint8Array): Ed25519PublicKey {
  bytes = ensureKey(bytes, crypto.publicKeyLength)
  return new Ed25519PublicKey(bytes)
}

export async function generateKeyPair (): Promise<Ed25519PrivateKey> {
  const { privateKey, publicKey } = await crypto.generateKey()
  return new Ed25519PrivateKey(privateKey, publicKey)
}

export async function generateKeyPairFromSeed (seed: Uint8Array): Promise<Ed25519PrivateKey> {
  const { privateKey, publicKey } = await crypto.generateKeyFromSeed(seed)
  return new Ed25519PrivateKey(privateKey, publicKey)
}

function ensureKey (key: Uint8Array, length: number): Uint8Array {
  key = Uint8Array.from(key ?? [])
  if (key.length !== length) {
    throw new CodeError(`Key must be a Uint8Array of length ${length}, got ${key.length}`, 'ERR_INVALID_KEY_TYPE')
  }
  return key
}
