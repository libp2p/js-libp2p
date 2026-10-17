import { CID } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import { base64url } from 'multiformats/bases/base64'
import { identity } from 'multiformats/hashes/identity'
import { Uint8ArrayList } from 'uint8arraylist'
import { withArrayBuffer as uint8ArrayWithArrayBuffer } from 'uint8arrays/with-array-buffer'
import { decodeDer, encodeBitString, encodeInteger, encodeOctetString, encodeSequence } from './der.ts'
import { InvalidParametersError } from './errors.ts'
import { PrivateKeyMessage, PublicKeyMessage } from './pb.ts'
import type { Crypto, PrivateKey, PublicKey } from './index.ts'
import type { AbortOptions } from 'abort-error'
import type { MultihashDigest } from 'multiformats'

// 1.2.840.10045.3.1.7 prime256v1 (ANSI X9.62 named elliptic curve)
const OID_256 = Uint8Array.from([0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07])
// 1.3.132.0.34 secp384r1 (SECG (Certicom) named elliptic curve)
const OID_384 = Uint8Array.from([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x22])
// 1.3.132.0.35 secp521r1 (SECG (Certicom) named elliptic curve)
const OID_521 = Uint8Array.from([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23])

const P_256_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-256'
}

const P_384_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-384'
}

const P_521_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-521'
}

const P_256_KEY_LENGTH = 32
const P_384_KEY_LENGTH = 48
const P_521_KEY_LENGTH = 66

class ECDSAPublicKey implements PublicKey {
  public type = 'ECDSA'
  public code = 3
  public jwk: JsonWebKey

  constructor (jwk: JsonWebKey) {
    this.jwk = jwk
  }

  toMultihash (): MultihashDigest<0x00> {
    return identity.digest(this.toProtobuf())
  }

  toCID (): CID<unknown, 0x72, 0x00, 1> {
    return CID.createV1(0x72, this.toMultihash())
  }

  toString (): string {
    return base58btc.encode(this.toMultihash().bytes).substring(1)
  }

  toJWK (): JsonWebKey {
    return JSON.parse(JSON.stringify(this.jwk))
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return PublicKeyMessage.encode({
      Type: this.code,
      Data: publicKeyToPKIMessage(this.jwk)
    })
  }

  async verify (message: Uint8Array, signature: Uint8Array, options?: AbortOptions): Promise<boolean> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'ECDSA',
      namedCurve: this.jwk.crv ?? 'P-256'
    }, false, ['verify'])
    const isValid = await crypto.subtle.verify({
      name: 'ECDSA',
      hash: {
        name: 'SHA-256'
      }
    }, key, uint8ArrayWithArrayBuffer(signature), uint8ArrayWithArrayBuffer(message))
    options?.signal?.throwIfAborted()

    return isValid
  }
}

class ECDSAPrivateKey implements PrivateKey {
  public type = 'ECDSA'
  public code = 3
  public jwk: JsonWebKey
  public publicKey: ECDSAPublicKey

  constructor (jwk: JsonWebKey, publicKey: ECDSAPublicKey) {
    this.jwk = jwk
    this.publicKey = publicKey
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return PrivateKeyMessage.encode({
      Type: this.code,
      Data: privateKeyToPKIMessage(this.jwk)
    })
  }

  toJWK (): JsonWebKey {
    return JSON.parse(JSON.stringify(this.jwk))
  }

  async sign (message: Uint8Array, options?: AbortOptions): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'ECDSA',
      namedCurve: this.jwk.crv ?? 'P-256'
    }, true, ['sign'])
    const sig = await crypto.subtle.sign({
      name: 'ECDSA',
      hash: {
        name: 'SHA-256'
      }
    }, key, uint8ArrayWithArrayBuffer(message))
    options?.signal?.throwIfAborted()

    return new Uint8Array(sig, 0, sig.byteLength)
  }
}

export interface CreateECDSAPrivateKeyOptions extends AbortOptions, Record<string, any> {
  /**
   * @default 'P-256'
   */
  curve?: 'P-256' | 'P-384' | 'P-521'
}

class ECDSACrypto implements Crypto {
  type = 'ECDSA'
  code = 3

  async generatePrivateKey (options?: CreateECDSAPrivateKeyOptions): Promise<PrivateKey> {
    const curve = options?.curve ?? 'P-256'
    const keyPair = await crypto.subtle.generateKey({
      name: 'ECDSA',
      namedCurve: curve
    }, true, ['sign', 'verify'])

    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

    options?.signal?.throwIfAborted()

    return new ECDSAPrivateKey(privateKeyJwk, new ECDSAPublicKey(publicKeyJwk))
  }

  async publicKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PublicKey> {
    const message = PublicKeyMessage.decode(buf)

    if (message.Data == null) {
      throw new InvalidParametersError('Data field was missing from protobuf')
    }

    if (message.Type !== this.code) {
      throw new InvalidParametersError('Incorrect Type field in protobuf')
    }

    options?.signal?.throwIfAborted()

    const publicKeyJwk = pkiToPublicJWK(message.Data)

    return new ECDSAPublicKey(publicKeyJwk)
  }

  async privateKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PrivateKey> {
    const message = PrivateKeyMessage.decode(buf)

    if (message.Data == null) {
      throw new InvalidParametersError('Data field was missing from protobuf')
    }

    if (message.Type !== this.code) {
      throw new InvalidParametersError('Incorrect Type field in protobuf')
    }

    const privateKeyJwk = pkiMessageToPrivateJWK(message.Data)
    const publicKeyJwk = privateJWKToPublicJWK(privateKeyJwk)

    options?.signal?.throwIfAborted()

    return new ECDSAPrivateKey(privateKeyJwk, new ECDSAPublicKey(publicKeyJwk))
  }
}

export function ecdsaCrypto (): Crypto {
  return new ECDSACrypto()
}

function privateJWKToPublicJWK (jwk: JsonWebKey): JsonWebKey {
  return {
    crv: jwk.crv,
    ext: true,
    key_ops: ['verify'],
    kty: 'EC',
    x: jwk.x,
    y: jwk.y
  }
}

function pkiMessageToPrivateJWK (buf: Uint8Array): JsonWebKey {
  const message = decodeDer(buf)
  const privateKey = message[1]
  const d = base64url.baseEncode(privateKey)
  const coordinates: Uint8Array = message[2][1][0]
  const offset = 1
  let x: string
  let y: string

  if (privateKey.byteLength === P_256_KEY_LENGTH) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_256_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_256_KEY_LENGTH))

    return {
      ...P_256_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    }
  }

  if (privateKey.byteLength === P_384_KEY_LENGTH) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_384_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_384_KEY_LENGTH))

    return {
      ...P_384_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    }
  }

  if (privateKey.byteLength === P_521_KEY_LENGTH) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_521_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_521_KEY_LENGTH))

    return {
      ...P_521_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    }
  }

  throw new InvalidParametersError(`Private key length was wrong length, got ${privateKey.byteLength}, expected 32, 48 or 66`)
}

function pkiToPublicJWK (buf: Uint8Array): JsonWebKey {
  const message = decodeDer(buf)

  const coordinates = message[1][1][0]
  const offset = 1
  let x: string
  let y: string

  if (coordinates.byteLength === ((P_256_KEY_LENGTH * 2) + 1)) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_256_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_256_KEY_LENGTH))

    return {
      ...P_256_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    }
  }

  if (coordinates.byteLength === ((P_384_KEY_LENGTH * 2) + 1)) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_384_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_384_KEY_LENGTH))

    return {
      ...P_384_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    }
  }

  if (coordinates.byteLength === ((P_521_KEY_LENGTH * 2) + 1)) {
    x = base64url.baseEncode(coordinates.subarray(offset, offset + P_521_KEY_LENGTH))
    y = base64url.baseEncode(coordinates.subarray(offset + P_521_KEY_LENGTH))

    return {
      ...P_521_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    }
  }

  throw new InvalidParametersError(`coordinates were wrong length, got ${coordinates.byteLength}, expected 65, 97 or 133`)
}

function publicKeyToPKIMessage (publicKey: JsonWebKey): Uint8Array {
  return encodeSequence([
    encodeInteger(Uint8Array.from([1])), // header
    encodeSequence([ // PKIProtection
      getOID(publicKey.crv)
    ], 0xA0),
    encodeSequence([ // extraCerts
      encodeBitString(
        new Uint8ArrayList(
          Uint8Array.from([0x04]),
          base64url.baseDecode(publicKey.x ?? ''),
          base64url.baseDecode(publicKey.y ?? '')
        )
      )
    ], 0xA1)
  ]).subarray()
}

function privateKeyToPKIMessage (privateKey: JsonWebKey): Uint8Array<ArrayBuffer> {
  return encodeSequence([
    encodeInteger(Uint8Array.from([1])), // header
    encodeOctetString(base64url.baseDecode(privateKey.d ?? '')), // body
    encodeSequence([ // PKIProtection
      getOID(privateKey.crv)
    ], 0xA0),
    encodeSequence([ // extraCerts
      encodeBitString(
        new Uint8ArrayList(
          Uint8Array.from([0x04]),
          base64url.baseDecode(privateKey.x ?? ''),
          base64url.baseDecode(privateKey.y ?? '')
        )
      )
    ], 0xA1)
  ]).subarray()
}

function getOID (curve?: string): Uint8Array<ArrayBuffer> {
  if (curve === 'P-256') {
    return OID_256
  }

  if (curve === 'P-384') {
    return OID_384
  }

  if (curve === 'P-521') {
    return OID_521
  }

  throw new InvalidParametersError(`Invalid curve ${curve}`)
}
