/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, enumeration } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Exchange {
  id?: Uint8Array
  pubkey?: PublicKey
}

export namespace Exchange {
  let _codec: Codec<Exchange>

  export const codec = (): Codec<Exchange> => {
    if (_codec == null) {
      _codec = message<Exchange>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.id != null) {
          writer.uint32(10)
          writer.bytes(obj.id)
        }

        if (obj.pubkey != null) {
          writer.uint32(18)
          PublicKey.codec().encode(obj.pubkey, writer)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.id = reader.bytes()
              break
            case 2:
              obj.pubkey = PublicKey.codec().decode(reader, reader.uint32())
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Exchange): Uint8Array => {
    return encodeMessage(obj, Exchange.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Exchange => {
    return decodeMessage(buf, Exchange.codec())
  }
}

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  Secp256k1 = 'Secp256k1',
  ECDSA = 'ECDSA'
}

enum __KeyTypeValues {
  RSA = 0,
  Ed25519 = 1,
  Secp256k1 = 2,
  ECDSA = 3
}

export namespace KeyType {
  export const codec = () => {
    return enumeration<KeyType>(__KeyTypeValues)
  }
}
export interface PublicKey {
  Type: KeyType
  Data: Uint8Array
}

export namespace PublicKey {
  let _codec: Codec<PublicKey>

  export const codec = (): Codec<PublicKey> => {
    if (_codec == null) {
      _codec = message<PublicKey>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.Type != null) {
          writer.uint32(8)
          KeyType.codec().encode(obj.Type, writer)
        } else {
          throw new Error('Protocol error: required field "Type" was not found in object')
        }

        if (obj.Data != null) {
          writer.uint32(18)
          writer.bytes(obj.Data)
        } else {
          throw new Error('Protocol error: required field "Data" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.Type = KeyType.codec().decode(reader)
              break
            case 2:
              obj.Data = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        if (obj.Type == null) {
          throw new Error('Protocol error: value for required field "Type" was not found in protobuf')
        }

        if (obj.Data == null) {
          throw new Error('Protocol error: value for required field "Data" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: PublicKey): Uint8Array => {
    return encodeMessage(obj, PublicKey.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PublicKey => {
    return decodeMessage(buf, PublicKey.codec())
  }
}
