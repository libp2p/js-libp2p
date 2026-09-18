import { decodeMessage, encodeMessage, enumeration, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  secp256k1 = 'secp256k1',
  ECDSA = 'ECDSA'
}

enum __KeyTypeValues {
  RSA = 0,
  Ed25519 = 1,
  secp256k1 = 2,
  ECDSA = 3
}

export namespace KeyType {
  export const codec = (): Codec<KeyType, KeyType> => {
    return enumeration<KeyType>(__KeyTypeValues)
  }
}

export interface PublicKey {
  type?: KeyType
  data?: Uint8Array<ArrayBuffer>
}

export interface PublicKeyInput {
  type?: KeyType
  data?: Uint8Array
}

export namespace PublicKey {
  let _codec: Codec<PublicKey, PublicKeyInput>

  export const codec = (): Codec<PublicKey, PublicKeyInput> => {
    if (_codec == null) {
      _codec = message<PublicKey, PublicKeyInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = KeyType.codec().decode(r)
              break
            }
            case 2: {
              obj.data = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PublicKey'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: KeyType.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}data`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PublicKey'
          }
        }
      })
    }

    return _codec
  }

  export interface PublicKeyTypeFieldEvent {
    field: '.type'
    value: KeyType
  }

  export interface PublicKeyDataFieldEvent {
    field: '.data'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PublicKeyInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PublicKey.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKey>): PublicKey {
    return decodeMessage(buf, PublicKey.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKey>): Generator<PublicKeyTypeFieldEvent | PublicKeyDataFieldEvent> {
    return streamMessage(buf, PublicKey.codec(), opts)
  }
}
