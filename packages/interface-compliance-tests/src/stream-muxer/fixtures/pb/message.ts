/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  message: string
  value: number
  flag: boolean
}

export namespace Message {
  let _codec: Codec<Message>

  export const codec = (): Codec<Message> => {
    if (_codec == null) {
      _codec = message<Message>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.message != null && obj.message !== '')) {
          w.uint32(10)
          w.string(obj.message)
        }

        if ((obj.value != null && obj.value !== 0)) {
          w.uint32(16)
          w.uint32(obj.value)
        }

        if ((obj.flag != null && obj.flag !== false)) {
          w.uint32(24)
          w.bool(obj.flag)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          message: '',
          value: 0,
          flag: false
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.message = reader.string()
              break
            case 2:
              obj.value = reader.uint32()
              break
            case 3:
              obj.flag = reader.bool()
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

  export const encode = (obj: Partial<Message>): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Message => {
    return decodeMessage(buf, Message.codec())
  }
}
