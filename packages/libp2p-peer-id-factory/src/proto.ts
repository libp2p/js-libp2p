/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface PeerIdProto {
  id: Uint8Array
  pubKey?: Uint8Array
  privKey?: Uint8Array
}

export namespace PeerIdProto {
  let _codec: Codec<PeerIdProto>

  export const codec = (): Codec<PeerIdProto> => {
    if (_codec == null) {
      _codec = message<PeerIdProto>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.id != null) {
          writer.uint32(10)
          writer.bytes(obj.id)
        } else {
          throw new Error('Protocol error: required field "id" was not found in object')
        }

        if (obj.pubKey != null) {
          writer.uint32(18)
          writer.bytes(obj.pubKey)
        }

        if (obj.privKey != null) {
          writer.uint32(26)
          writer.bytes(obj.privKey)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          id: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.id = reader.bytes()
              break
            case 2:
              obj.pubKey = reader.bytes()
              break
            case 3:
              obj.privKey = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        if (obj.id == null) {
          throw new Error('Protocol error: value for required field "id" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: PeerIdProto): Uint8Array => {
    return encodeMessage(obj, PeerIdProto.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerIdProto => {
    return decodeMessage(buf, PeerIdProto.codec())
  }
}
