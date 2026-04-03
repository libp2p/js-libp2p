import { decodeMessage, encodeMessage, enumeration, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  secp256k1 = 'secp256k1',
  ECDSA = 'ECDSA',
  MLDSA = 'MLDSA'
}

enum __KeyTypeValues {
  RSA = 0,
  Ed25519 = 1,
  secp256k1 = 2,
  ECDSA = 3,
  MLDSA = 4
}

export namespace KeyType {
  export const codec = (): Codec<KeyType> => {
    return enumeration<KeyType>(__KeyTypeValues)
  }
}

export interface PublicKey {
  type?: KeyType
  data?: Uint8Array
}

export namespace PublicKey {
  let _codec: Codec<PublicKey>

  export const codec = (): Codec<PublicKey> => {
    if (_codec == null) {
      _codec = message<PublicKey>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          KeyType.codec().encode(obj.type, w)
        }

        if (obj.data != null) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = KeyType.codec().decode(reader)
              break
            }
            case 2: {
              obj.data = reader.bytes()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.type`,
                value: KeyType.codec().decode(reader)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.data`,
                value: reader.bytes()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface PublicKeyTypeFieldEvent {
    field: '$.type'
    value: KeyType
  }

  export interface PublicKeyDataFieldEvent {
    field: '$.data'
    value: Uint8Array
  }

  export function encode (obj: Partial<PublicKey>): Uint8Array {
    return encodeMessage(obj, PublicKey.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKey>): PublicKey {
    return decodeMessage(buf, PublicKey.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKey>): Generator<PublicKeyTypeFieldEvent | PublicKeyDataFieldEvent> {
    return streamMessage(buf, PublicKey.codec(), opts)
  }
}
