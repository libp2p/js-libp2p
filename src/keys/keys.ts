/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export enum KeyType {
  RSA = 'RSA',
  Ed25519 = 'Ed25519',
  Secp256k1 = 'Secp256k1'
}

enum __KeyTypeValues {
  RSA = 0,
  Ed25519 = 1,
  Secp256k1 = 2
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
        const obj: any = {
          Type: KeyType.RSA,
          Data: new Uint8Array(0)
        }

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

export interface PrivateKey {
  Type: KeyType
  Data: Uint8Array
}

export namespace PrivateKey {
  let _codec: Codec<PrivateKey>

  export const codec = (): Codec<PrivateKey> => {
    if (_codec == null) {
      _codec = message<PrivateKey>((obj, writer, opts = {}) => {
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
        const obj: any = {
          Type: KeyType.RSA,
          Data: new Uint8Array(0)
        }

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

  export const encode = (obj: PrivateKey): Uint8Array => {
    return encodeMessage(obj, PrivateKey.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PrivateKey => {
    return decodeMessage(buf, PrivateKey.codec())
  }
}
