/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PeerIdProto {
  id?: Uint8Array
  pubKey?: Uint8Array
  privKey?: Uint8Array
}

export namespace PeerIdProto {
  let _codec: Codec<PeerIdProto>

  export const codec = (): Codec<PeerIdProto> => {
    if (_codec == null) {
      _codec = message<PeerIdProto>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.id != null) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.pubKey != null) {
          w.uint32(18)
          w.bytes(obj.pubKey)
        }

        if (obj.privKey != null) {
          w.uint32(26)
          w.bytes(obj.privKey)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
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

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<PeerIdProto>): Uint8Array => {
    return encodeMessage(obj, PeerIdProto.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerIdProto => {
    return decodeMessage(buf, PeerIdProto.codec())
  }
}
