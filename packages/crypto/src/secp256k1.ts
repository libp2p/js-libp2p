import { secp256k1 as secp } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { base58btc } from 'multiformats/bases/base58'
import { base64url } from 'multiformats/bases/base64'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { InvalidParametersError, withKeyErrors } from './errors.ts'
import { PrivateKeyMessage, PublicKeyMessage } from './pb.ts'
import type { AbortOptions, Crypto, PrivateKey, PublicKey } from '@libp2p/interface'
import type { MultihashDigest } from 'multiformats'

const CODE = 2

class Secp256k1PublicKey implements PublicKey {
  readonly type = 'secp256k1'
  readonly code = CODE
  // kept as received so the protobuf, and the peer id, never change
  private readonly key: Uint8Array

  constructor (key: Uint8Array) {
    this.key = key
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

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return PublicKeyMessage.encode({ Type: CODE, Data: this.key })
  }

  toJWK (): JsonWebKey {
    const point = secp.Point.fromBytes(this.key).toBytes(false)

    return {
      kty: 'EC',
      crv: 'secp256k1',
      x: base64url.baseEncode(point.subarray(1, 33)),
      y: base64url.baseEncode(point.subarray(33))
    }
  }

  async verify (message: Uint8Array, signature: Uint8Array, options?: AbortOptions): Promise<boolean> {
    options?.signal?.throwIfAborted()

    try {
      return secp.verify(signature, sha256(message), this.key, { prehash: false, format: 'der' })
    } catch {
      return false
    }
  }
}

class Secp256k1PrivateKey implements PrivateKey {
  readonly type = 'secp256k1'
  readonly code = CODE
  readonly publicKey: Secp256k1PublicKey
  private readonly key: Uint8Array

  constructor (key: Uint8Array) {
    this.key = key
    this.publicKey = new Secp256k1PublicKey(secp.getPublicKey(key, true))
  }

  toProtobuf (): Uint8Array<ArrayBuffer> {
    return PrivateKeyMessage.encode({ Type: CODE, Data: this.key })
  }

  toJWK (): JsonWebKey {
    return { ...this.publicKey.toJWK(), d: base64url.baseEncode(this.key) }
  }

  async sign (message: Uint8Array, options?: AbortOptions): Promise<Uint8Array<ArrayBuffer>> {
    options?.signal?.throwIfAborted()

    return withArrayBuffer(secp.sign(sha256(message), this.key, { prehash: false, format: 'der' }))
  }
}

class Secp256k1Crypto implements Crypto {
  readonly type = 'secp256k1'
  readonly code = CODE

  async generatePrivateKey (options?: AbortOptions): Promise<PrivateKey> {
    options?.signal?.throwIfAborted()

    return new Secp256k1PrivateKey(secp.utils.randomSecretKey())
  }

  async publicKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PublicKey> {
    const { Type, Data } = PublicKeyMessage.decode(buf)

    if (Type !== CODE || Data == null) {
      throw new InvalidParametersError('Not a secp256k1 public key')
    }

    try {
      secp.Point.fromBytes(Data)
    } catch (err: any) {
      throw new InvalidParametersError(`Invalid secp256k1 public key - ${err.message}`)
    }

    options?.signal?.throwIfAborted()

    return new Secp256k1PublicKey(Data)
  }

  async privateKeyFromProtobuf (buf: Uint8Array, options?: AbortOptions): Promise<PrivateKey> {
    const { Type, Data } = PrivateKeyMessage.decode(buf)

    if (Type !== CODE || Data?.byteLength !== 32) {
      throw new InvalidParametersError('Not a secp256k1 private key')
    }

    try {
      secp.getPublicKey(Data, true)
    } catch (err: any) {
      throw new InvalidParametersError(`Invalid secp256k1 private key - ${err.message}`)
    }

    options?.signal?.throwIfAborted()

    return new Secp256k1PrivateKey(Data)
  }
}

export function secp256k1Crypto (): Crypto {
  return withKeyErrors(new Secp256k1Crypto())
}
