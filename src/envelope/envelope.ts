/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Envelope {
  publicKey: Uint8Array
  payloadType: Uint8Array
  payload: Uint8Array
  signature: Uint8Array
}

export namespace Envelope {
  let _codec: Codec<Envelope>

  export const codec = (): Codec<Envelope> => {
    if (_codec == null) {
      _codec = message<Envelope>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.publicKey != null) {
          writer.uint32(10)
          writer.bytes(obj.publicKey)
        } else {
          throw new Error('Protocol error: required field "publicKey" was not found in object')
        }

        if (obj.payloadType != null) {
          writer.uint32(18)
          writer.bytes(obj.payloadType)
        } else {
          throw new Error('Protocol error: required field "payloadType" was not found in object')
        }

        if (obj.payload != null) {
          writer.uint32(26)
          writer.bytes(obj.payload)
        } else {
          throw new Error('Protocol error: required field "payload" was not found in object')
        }

        if (obj.signature != null) {
          writer.uint32(42)
          writer.bytes(obj.signature)
        } else {
          throw new Error('Protocol error: required field "signature" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          publicKey: new Uint8Array(0),
          payloadType: new Uint8Array(0),
          payload: new Uint8Array(0),
          signature: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.publicKey = reader.bytes()
              break
            case 2:
              obj.payloadType = reader.bytes()
              break
            case 3:
              obj.payload = reader.bytes()
              break
            case 5:
              obj.signature = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        if (obj.publicKey == null) {
          throw new Error('Protocol error: value for required field "publicKey" was not found in protobuf')
        }

        if (obj.payloadType == null) {
          throw new Error('Protocol error: value for required field "payloadType" was not found in protobuf')
        }

        if (obj.payload == null) {
          throw new Error('Protocol error: value for required field "payload" was not found in protobuf')
        }

        if (obj.signature == null) {
          throw new Error('Protocol error: value for required field "signature" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Envelope): Uint8Array => {
    return encodeMessage(obj, Envelope.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Envelope => {
    return decodeMessage(buf, Envelope.codec())
  }
}
