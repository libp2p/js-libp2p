/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Record {
  key: Uint8Array
  value: Uint8Array
  timeReceived: string
}

export namespace Record {
  let _codec: Codec<Record>

  export const codec = (): Codec<Record> => {
    if (_codec == null) {
      _codec = message<Record>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.key != null) {
          writer.uint32(10)
          writer.bytes(obj.key)
        } else {
          throw new Error('Protocol error: required field "key" was not found in object')
        }

        if (obj.value != null) {
          writer.uint32(18)
          writer.bytes(obj.value)
        } else {
          throw new Error('Protocol error: required field "value" was not found in object')
        }

        if (obj.timeReceived != null) {
          writer.uint32(42)
          writer.string(obj.timeReceived)
        } else {
          throw new Error('Protocol error: required field "timeReceived" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          key: new Uint8Array(0),
          value: new Uint8Array(0),
          timeReceived: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.key = reader.bytes()
              break
            case 2:
              obj.value = reader.bytes()
              break
            case 5:
              obj.timeReceived = reader.string()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        if (obj.key == null) {
          throw new Error('Protocol error: value for required field "key" was not found in protobuf')
        }

        if (obj.value == null) {
          throw new Error('Protocol error: value for required field "value" was not found in protobuf')
        }

        if (obj.timeReceived == null) {
          throw new Error('Protocol error: value for required field "timeReceived" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Record): Uint8Array => {
    return encodeMessage(obj, Record.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Record => {
    return decodeMessage(buf, Record.codec())
  }
}
