/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Tags {
  tags: Tag[]
}

export namespace Tags {
  let _codec: Codec<Tags>

  export const codec = (): Codec<Tags> => {
    if (_codec == null) {
      _codec = message<Tags>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.tags != null) {
          for (const value of obj.tags) {
            w.uint32(10)
            Tag.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          tags: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.tags.push(Tag.codec().decode(reader, reader.uint32()))
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

  export const encode = (obj: Partial<Tags>): Uint8Array => {
    return encodeMessage(obj, Tags.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Tags => {
    return decodeMessage(buf, Tags.codec())
  }
}

export interface Tag {
  name: string
  value?: number
  expiry?: bigint
}

export namespace Tag {
  let _codec: Codec<Tag>

  export const codec = (): Codec<Tag> => {
    if (_codec == null) {
      _codec = message<Tag>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.name != null && obj.name !== '')) {
          w.uint32(10)
          w.string(obj.name)
        }

        if (obj.value != null) {
          w.uint32(16)
          w.uint32(obj.value)
        }

        if (obj.expiry != null) {
          w.uint32(24)
          w.uint64(obj.expiry)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          name: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.name = reader.string()
              break
            case 2:
              obj.value = reader.uint32()
              break
            case 3:
              obj.expiry = reader.uint64()
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

  export const encode = (obj: Partial<Tag>): Uint8Array => {
    return encodeMessage(obj, Tag.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Tag => {
    return decodeMessage(buf, Tag.codec())
  }
}
