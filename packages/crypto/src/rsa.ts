import { CID } from 'multiformats'
import { base36 } from 'multiformats/bases/base36'
import { base64url } from 'multiformats/bases/base64'
import { sha256 } from 'multiformats/hashes/sha2'
import { withArrayBuffer as uint8ArrayWithArrayBuffer } from 'uint8arrays/with-array-buffer'
import { decodeDer, encodeBitString, encodeInteger, encodeSequence } from './der.ts'
import { InvalidParametersError } from './errors.ts'
import { PrivateKeyMessage, PublicKeyMessage } from './pb.ts'
import type { Crypto, PrivateKey, PublicKey } from './index.ts'
import type { AbortOptions } from 'abort-error'
import type { MultihashDigest } from 'multiformats'

export const MAX_RSA_KEY_SIZE = 8192

class RSAPublicKey implements PublicKey {
  public type = 'RSA'
  public code = 0
  public _raw?: Uint8Array<ArrayBuffer>
  private digest: MultihashDigest<0x012>
  private jwk: JsonWebKey

  constructor (jwk: JsonWebKey, digest: MultihashDigest<0x012>) {
    if (rsaKeySize(jwk) > MAX_RSA_KEY_SIZE) {
      throw new InvalidParametersError('Key size is too large')
    }

    this.jwk = jwk
    this.digest = digest
  }

  toMultihash (): MultihashDigest<0x012> {
    return this.digest
  }

  toCID (): CID<unknown, 0x72, 0x12, 1> {
    return CID.createV1(0x72, this.toMultihash())
  }

  toString (): string {
    return this.toCID().toString(base36)
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return publicKeyToProtobuf(this.code, this.jwk)
  }

  toJWK (): JsonWebKey {
    return JSON.parse(JSON.stringify(this.jwk))
  }

  async verify (message: Uint8Array, signature: Uint8Array, options?: AbortOptions): Promise<boolean> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {
        name: 'SHA-256'
      }
    }, false, ['verify'])
    const result = await crypto.subtle.verify({
      name: 'RSASSA-PKCS1-v1_5'
    }, key, uint8ArrayWithArrayBuffer(signature), uint8ArrayWithArrayBuffer(message))
    options?.signal?.throwIfAborted()

    return result
  }
}

class RSAPrivateKey implements PrivateKey {
  public type = 'RSA'
  public code = 0
  public publicKey: PublicKey
  private readonly jwk: JsonWebKey

  constructor (jwk: JsonWebKey, publicKey: PublicKey) {
    if (rsaKeySize(jwk) > MAX_RSA_KEY_SIZE) {
      throw new InvalidParametersError('Key size is too large')
    }

    this.jwk = jwk
    this.publicKey = publicKey
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return privateKeyToProtobuf(this.code, this.jwk)
  }

  toJWK (): JsonWebKey {
    return JSON.parse(JSON.stringify(this.jwk))
  }

  async sign (message: Uint8Array, options?: AbortOptions): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {
        name: 'SHA-256'
      }
    }, false, ['sign'])
    const sig = await crypto.subtle.sign({
      name: 'RSASSA-PKCS1-v1_5'
    }, key, uint8ArrayWithArrayBuffer(message))

    options?.signal?.throwIfAborted()

    return new Uint8Array(sig, 0, sig.byteLength)
  }
}

export interface CreateRSAPrivateKeyOptions extends AbortOptions, Record<string, any> {
  /**
   * The key size
   *
   * @default 2048
   */
  bits?: number
}

class RSACrypto implements Crypto {
  public type = 'RSA'
  public code = 0

  async generatePrivateKey (options?: CreateRSAPrivateKeyOptions): Promise<PrivateKey> {
    const modulusLength = options?.bits ?? 2048

    if (modulusLength > MAX_RSA_KEY_SIZE) {
      throw new InvalidParametersError('Key size is too large')
    }

    const keypair = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {
        name: 'SHA-256'
      }
    }, true, ['sign', 'verify'])

    const jwkPrivateKey = await crypto.subtle.exportKey('jwk', keypair.privateKey)
    const jwkPublicKey = await crypto.subtle.exportKey('jwk', keypair.publicKey)
    const digest = await publicKeyId(jwkPrivateKey)

    options?.signal?.throwIfAborted()

    return new RSAPrivateKey(jwkPrivateKey, new RSAPublicKey(jwkPublicKey, digest))
  }

  async publicKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PublicKey> {
    const message = PublicKeyMessage.decode(buf)

    if (message.Data == null) {
      throw new InvalidParametersError('Data field was missing from protobuf')
    }

    if (message.Type !== this.code) {
      throw new InvalidParametersError('Incorrect Type field in protobuf')
    }

    const publicKeyJwk = pkixMessageToJwk(message.Data)
    const digest = await publicKeyId(publicKeyJwk)

    options?.signal?.throwIfAborted()

    return new RSAPublicKey(publicKeyJwk, digest)
  }

  async privateKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PrivateKey> {
    const message = PrivateKeyMessage.decode(buf)

    if (message.Data == null) {
      throw new InvalidParametersError('Data field was missing from protobuf')
    }

    if (message.Type !== this.code) {
      throw new InvalidParametersError('Incorrect Type field in protobuf')
    }

    const pkcs1 = decodeDer(message.Data)
    const privateKeyJwk = pkcs1MessageToJwk(pkcs1)
    const publicKeyJwk = privateJWKToPublicJWK(privateKeyJwk)
    const digest = await publicKeyId(publicKeyJwk)

    options?.signal?.throwIfAborted()

    return new RSAPrivateKey(privateKeyJwk, new RSAPublicKey(publicKeyJwk, digest))
  }
}

export function rsaCrypto (): Crypto {
  return new RSACrypto()
}

/**
 * Convert private key PKCS#1 in ASN1 DER format to JWK
 */
function pkcs1MessageToJwk (message: Uint8Array[]): JsonWebKey {
  return {
    alg: 'RS256',
    kty: 'RSA',
    n: base64url.baseEncode(message[1]),
    e: base64url.baseEncode(message[2]),
    ext: true,
    key_ops: [
      'sign'
    ],
    d: base64url.baseEncode(message[3]),
    p: base64url.baseEncode(message[4]),
    q: base64url.baseEncode(message[5]),
    dp: base64url.baseEncode(message[6]),
    dq: base64url.baseEncode(message[7]),
    qi: base64url.baseEncode(message[8])
  }
}

/**
 * Convert a JWK private key into PKCS#1 in ASN1 DER format
 */
function jwkToPkcs1 (jwk: JsonWebKey): Uint8Array<ArrayBuffer> {
  if (jwk.n == null || jwk.e == null || jwk.d == null || jwk.p == null || jwk.q == null || jwk.dp == null || jwk.dq == null || jwk.qi == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  return encodeSequence([
    encodeInteger(Uint8Array.from([0])),
    encodeInteger(base64url.baseDecode(jwk.n)),
    encodeInteger(base64url.baseDecode(jwk.e)),
    encodeInteger(base64url.baseDecode(jwk.d)),
    encodeInteger(base64url.baseDecode(jwk.p)),
    encodeInteger(base64url.baseDecode(jwk.q)),
    encodeInteger(base64url.baseDecode(jwk.dp)),
    encodeInteger(base64url.baseDecode(jwk.dq)),
    encodeInteger(base64url.baseDecode(jwk.qi))
  ]).subarray()
}

const RSA_ALGORITHM_IDENTIFIER = Uint8Array.from([
  0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00
])

function jwkToPkix (jwk: JsonWebKey): Uint8Array<ArrayBuffer> {
  if (jwk.n == null || jwk.e == null) {
    throw new InvalidParametersError('JWK public key was missing components')
  }

  const subjectPublicKeyInfo = encodeSequence([
    RSA_ALGORITHM_IDENTIFIER,
    encodeBitString(
      encodeSequence([
        encodeInteger(base64url.baseDecode(jwk.n)),
        encodeInteger(base64url.baseDecode(jwk.e))
      ])
    )
  ])

  return subjectPublicKeyInfo.subarray()
}

function pkixMessageToJwk (message: Uint8Array): JsonWebKey {
  const cert = decodeDer(message)

  if (cert.length < 2 || cert[0]?.[0] !== '1.2.840.113549.1.1.1') {
    throw new Error('PKIX certificate was invalid')
  }

  const keys = decodeDer(cert[1])

  return {
    kty: 'RSA',
    n: base64url.baseEncode(keys[0]),
    e: base64url.baseEncode(keys[1])
  }
}

function privateJWKToPublicJWK (jwk: JsonWebKey): JsonWebKey {
  return {
    key_ops: ['verify'],
    ext: true,
    alg: 'RS256',
    kty: 'RSA',
    n: jwk.n,
    // cspell:ignore AQAB
    e: 'AQAB'
  }
}

function rsaKeySize (jwk: JsonWebKey): number {
  if (jwk.kty !== 'RSA') {
    throw new InvalidParametersError('Invalid key type')
  } else if (jwk.n == null) {
    throw new InvalidParametersError('Invalid key modulus')
  }

  const modulus = base64url.baseDecode(jwk.n)
  return modulus.length * 8
}

async function publicKeyId (jwk: JsonWebKey): Promise<MultihashDigest<0x12>> {
  const data = PublicKeyMessage.encode({
    Type: 0,
    Data: jwkToPkix(jwk)
  })

  return sha256.digest(data)
}

function publicKeyToProtobuf (code: number, jwk: JsonWebKey): Uint8Array<ArrayBuffer> {
  return PublicKeyMessage.encode({
    Type: code,
    Data: jwkToPkix(jwk)
  })
}

function privateKeyToProtobuf (code: number, jwk: JsonWebKey): Uint8Array<ArrayBuffer> {
  return PrivateKeyMessage.encode({
    Type: code,
    Data: jwkToPkcs1(jwk)
  })
}
