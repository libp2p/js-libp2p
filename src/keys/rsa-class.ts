
import { sha256 } from 'multiformats/hashes/sha2'
import errcode from 'err-code'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import 'node-forge/lib/sha512.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import * as crypto from './rsa.js'
import * as pbm from './keys.js'
import { exporter } from './exporter.js'

export class RsaPublicKey {
  private readonly _key: JsonWebKey

  constructor (key: JsonWebKey) {
    this._key = key
  }

  async verify (data: Uint8Array, sig: Uint8Array) { // eslint-disable-line require-await
    return await crypto.hashAndVerify(this._key, sig, data)
  }

  marshal () {
    return crypto.utils.jwkToPkix(this._key)
  }

  get bytes () {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    }).subarray()
  }

  encrypt (bytes: Uint8Array) {
    return crypto.encrypt(this._key, bytes)
  }

  equals (key: any) {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash () {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }
}

export class RsaPrivateKey {
  private readonly _key: JsonWebKey
  private readonly _publicKey: JsonWebKey

  constructor (key: JsonWebKey, publicKey: JsonWebKey) {
    this._key = key
    this._publicKey = publicKey
  }

  genSecret () {
    return crypto.getRandomValues(16)
  }

  async sign (message: Uint8Array) { // eslint-disable-line require-await
    return await crypto.hashAndSign(this._key, message)
  }

  get public () {
    if (this._publicKey == null) {
      throw errcode(new Error('public key not provided'), 'ERR_PUBKEY_NOT_PROVIDED')
    }

    return new RsaPublicKey(this._publicKey)
  }

  decrypt (bytes: Uint8Array) {
    return crypto.decrypt(this._key, bytes)
  }

  marshal () {
    return crypto.utils.jwkToPkcs1(this._key)
  }

  get bytes () {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    }).subarray()
  }

  equals (key: any) {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash () {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }

  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   */
  async id () {
    const hash = await this.public.hash()
    return uint8ArrayToString(hash, 'base58btc')
  }

  /**
   * Exports the key into a password protected PEM format
   */
  async export (password: string, format = 'pkcs-8') { // eslint-disable-line require-await
    if (format === 'pkcs-8') {
      const buffer = new forge.util.ByteBuffer(this.marshal())
      const asn1 = forge.asn1.fromDer(buffer)
      const privateKey = forge.pki.privateKeyFromAsn1(asn1)

      const options = {
        algorithm: 'aes256',
        count: 10000,
        saltSize: 128 / 8,
        prfAlgorithm: 'sha512'
      }
      return forge.pki.encryptRsaPrivateKey(privateKey, password, options)
    } else if (format === 'libp2p-key') {
      return await exporter(this.bytes, password)
    } else {
      throw errcode(new Error(`export format '${format}' is not supported`), 'ERR_INVALID_EXPORT_FORMAT')
    }
  }
}

export async function unmarshalRsaPrivateKey (bytes: Uint8Array) {
  const jwk = crypto.utils.pkcs1ToJwk(bytes)
  const keys = await crypto.unmarshalPrivateKey(jwk)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

export function unmarshalRsaPublicKey (bytes: Uint8Array) {
  const jwk = crypto.utils.pkixToJwk(bytes)
  return new RsaPublicKey(jwk)
}

export async function fromJwk (jwk: JsonWebKey) {
  const keys = await crypto.unmarshalPrivateKey(jwk)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

export async function generateKeyPair (bits: number) {
  const keys = await crypto.generateKey(bits)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}
