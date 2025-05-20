import { decodeMessage, encodeMessage, enumeration, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Exchange {
  id?: Uint8Array
  pubkey?: PublicKey
}

export namespace Exchange {
  let _codec: Codec<Exchange>

  export const codec = (): Codec<Exchange> => {
    if (_codec == null) {
      _codec = message<Exchange>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.id != null) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.pubkey != null) {
          w.uint32(18)
          PublicKey.codec().encode(obj.pubkey, w)
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
              obj.id = reader.bytes()
              break
            }
            case 2: {
              obj.pubkey = PublicKey.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.pubkey
              })
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Exchange>): Uint8Array => {
    return encodeMessage(obj, Exchange.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Exchange>): Exchange => {
    return decodeMessage(buf, Exchange.codec(), opts)
  }
}

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
export interface PublicKey {
  Type?: KeyType
  Data: Uint8Array
}

export namespace PublicKey {
  let _codec: Codec<PublicKey>

  export const codec = (): Codec<PublicKey> => {
    if (_codec == null) {
      _codec = message<PublicKey>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.Type != null) {
          w.uint32(8)
          KeyType.codec().encode(obj.Type, w)
        }

        if ((obj.Data != null && obj.Data.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.Data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          Data: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.Type = KeyType.codec().decode(reader)
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<PublicKey>): Uint8Array => {
    return encodeMessage(obj, PublicKey.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PublicKey>): PublicKey => {
    return decodeMessage(buf, PublicKey.codec(), opts)
  }
}
