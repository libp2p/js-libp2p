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
  export const codec = (): Codec<KeyType> => {
    return enumeration<KeyType>(__KeyTypeValues)
  }
}

export interface PublicKeyMessage {
  Type?: number
  Data?: Uint8Array
}

export namespace PublicKeyMessage {
  let _codec: Codec<PublicKeyMessage>

  export const codec = (): Codec<PublicKeyMessage> => {
    if (_codec == null) {
      _codec = message<PublicKeyMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.Type != null) {
          w.uint32(8)
          w.int32(obj.Type)
        }

        if (obj.Data != null) {
          w.uint32(18)
          w.bytes(obj.Data)
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
              obj.Type = reader.int32()
              break
            }
            case 2: {
              obj.Data = reader.bytes()
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
                field: `${prefix}.Type`,
                value: reader.int32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.Data`,
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

  export interface PublicKeyMessageTypeFieldEvent {
    field: '$.Type'
    value: number
  }

  export interface PublicKeyMessageDataFieldEvent {
    field: '$.Data'
    value: Uint8Array
  }

  export function encode (obj: Partial<PublicKeyMessage>): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PublicKeyMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKeyMessage>): PublicKeyMessage {
    return decodeMessage(buf, PublicKeyMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKeyMessage>): Generator<PublicKeyMessageTypeFieldEvent | PublicKeyMessageDataFieldEvent> {
    return streamMessage(buf, PublicKeyMessage.codec(), opts)
  }
}

export interface PrivateKeyMessage {
  Type?: number
  Data?: Uint8Array
}

export namespace PrivateKeyMessage {
  let _codec: Codec<PrivateKeyMessage>

  export const codec = (): Codec<PrivateKeyMessage> => {
    if (_codec == null) {
      _codec = message<PrivateKeyMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.Type != null) {
          w.uint32(8)
          w.int32(obj.Type)
        }

        if (obj.Data != null) {
          w.uint32(18)
          w.bytes(obj.Data)
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
              obj.Type = reader.int32()
              break
            }
            case 2: {
              obj.Data = reader.bytes()
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
                field: `${prefix}.Type`,
                value: reader.int32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.Data`,
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

  export interface PrivateKeyMessageTypeFieldEvent {
    field: '$.Type'
    value: number
  }

  export interface PrivateKeyMessageDataFieldEvent {
    field: '$.Data'
    value: Uint8Array
  }

  export function encode (obj: Partial<PrivateKeyMessage>): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PrivateKeyMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PrivateKeyMessage>): PrivateKeyMessage {
    return decodeMessage(buf, PrivateKeyMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PrivateKeyMessage>): Generator<PrivateKeyMessageTypeFieldEvent | PrivateKeyMessageDataFieldEvent> {
    return streamMessage(buf, PrivateKeyMessage.codec(), opts)
  }
}
