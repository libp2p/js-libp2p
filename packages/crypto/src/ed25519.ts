import { CID } from 'multiformats'
import { base58btc } from 'multiformats/bases/base58'
import { base64url } from 'multiformats/bases/base64'
import { identity } from 'multiformats/hashes/identity'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { withArrayBuffer as uint8ArrayWithArrayBuffer } from 'uint8arrays/with-array-buffer'
import { InvalidParametersError } from './errors.ts'
import { PrivateKeyMessage, PublicKeyMessage } from './pb.ts'
import type { Crypto, PrivateKey, PublicKey } from './index.ts'
import type { AbortOptions } from 'abort-error'
import type { MultihashDigest } from 'multiformats'

const PRIVATE_KEY_LENGTH = 32

class Ed25519PublicKey implements PublicKey {
  public type = 'Ed25519'
  public code = 1
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
      Data: base64url.baseDecode(this.jwk.x ?? '')
    })
  }

  async verify (message: Uint8Array, signature: Uint8Array, options?: AbortOptions): Promise<boolean> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'Ed25519'
    }, false, ['verify'])
    const isValid = await crypto.subtle.verify({
      name: 'Ed25519'
    }, key, uint8ArrayWithArrayBuffer(signature), uint8ArrayWithArrayBuffer(message))
    options?.signal?.throwIfAborted()

    return isValid
  }
}

class Ed25519PrivateKey implements PrivateKey {
  public type = 'Ed25519'
  public code = 1
  public jwk: JsonWebKey
  public publicKey: Ed25519PublicKey

  constructor (jwk: JsonWebKey, publicKey: Ed25519PublicKey) {
    this.jwk = jwk
    this.publicKey = publicKey
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return PrivateKeyMessage.encode({
      Type: this.code,
      Data: uint8ArrayConcat([
        base64url.baseDecode(this.jwk.d ?? ''),
        base64url.baseDecode(this.jwk.x ?? '')
      ], 64)
    })
  }

  toJWK (): JsonWebKey {
    return JSON.parse(JSON.stringify(this.jwk))
  }

  async sign (message: Uint8Array, options?: AbortOptions): Promise<Uint8Array<ArrayBuffer>> {
    const key = await crypto.subtle.importKey('jwk', this.jwk, {
      name: 'Ed25519'
    }, true, ['sign'])
    const sig = await crypto.subtle.sign({
      name: 'Ed25519'
    }, key, uint8ArrayWithArrayBuffer(message))
    options?.signal?.throwIfAborted()

    return new Uint8Array(sig, 0, sig.byteLength)
  }
}

class Ed25519Crypto implements Crypto {
  type = 'Ed25519'
  code = 1

  async generatePrivateKey (options?: AbortOptions & Record<string, any>): Promise<PrivateKey> {
    const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

    options?.signal?.throwIfAborted()

    return new Ed25519PrivateKey(privateKeyJwk, new Ed25519PublicKey(publicKeyJwk))
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

    const publicKeyJwk = x5519ToPublicJWK(message.Data)

    return new Ed25519PublicKey(publicKeyJwk)
  }

  async privateKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PrivateKey> {
    const message = PrivateKeyMessage.decode(buf)

    if (message.Data == null) {
      throw new InvalidParametersError('Data field was missing from protobuf')
    }

    if (message.Type !== this.code) {
      throw new InvalidParametersError('Incorrect Type field in protobuf')
    }

    const privateKeyJwk = await derivePrivateJWK(message.Data, options)
    const publicKeyJwk = privateJWKToPublicJWK(privateKeyJwk)

    return new Ed25519PrivateKey(privateKeyJwk, new Ed25519PublicKey(publicKeyJwk))
  }
}

export function ed25519Crypto (): Crypto {
  return new Ed25519Crypto()
}

async function derivePrivateJWK (raw: Uint8Array, options?: AbortOptions): Promise<JsonWebKey> {
  const privateKey = raw.subarray(0, PRIVATE_KEY_LENGTH)
  const pkcs8 = convertRawX25519KeyToPKCS(privateKey)
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, {
    name: 'Ed25519'
  }, true, ['sign'])

  const jwk = await crypto.subtle.exportKey('jwk', key)

  options?.signal?.throwIfAborted()

  return jwk
}

const PKCS8_HEADER = Uint8Array.from([
  48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4
])

function convertRawX25519KeyToPKCS (privateKey: Uint8Array): Uint8Array<ArrayBuffer> {
  return uint8ArrayConcat([
    PKCS8_HEADER,
    Uint8Array.from([privateKey.byteLength]),
    privateKey
  ], PKCS8_HEADER.byteLength + 1 + privateKey.byteLength)
}

function privateJWKToPublicJWK (jwk: JsonWebKey): JsonWebKey {
  return {
    alg: 'Ed25519',
    crv: 'Ed25519',
    ext: true,
    key_ops: ['verify'],
    kty: 'OKP',
    x: jwk.x
  }
}

function x5519ToPublicJWK (buf: Uint8Array): JsonWebKey {
  return {
    alg: 'Ed25519',
    crv: 'Ed25519',
    ext: true,
    key_ops: ['verify'],
    kty: 'OKP',
    x: base64url.baseEncode(buf)
  }
}
