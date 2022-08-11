/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Tags {
  tags: Tag[]
}

export namespace Tags {
  let _codec: Codec<Tags>

  export const codec = (): Codec<Tags> => {
    if (_codec == null) {
      _codec = message<Tags>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.tags != null) {
          for (const value of obj.tags) {
            writer.uint32(10)
            Tag.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "tags" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: Tags): Uint8Array => {
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
      _codec = message<Tag>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.name != null) {
          writer.uint32(10)
          writer.string(obj.name)
        } else {
          throw new Error('Protocol error: required field "name" was not found in object')
        }

        if (obj.value != null) {
          writer.uint32(16)
          writer.uint32(obj.value)
        }

        if (obj.expiry != null) {
          writer.uint32(24)
          writer.uint64(obj.expiry)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

        if (obj.name == null) {
          throw new Error('Protocol error: value for required field "name" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Tag): Uint8Array => {
    return encodeMessage(obj, Tag.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Tag => {
    return decodeMessage(buf, Tag.codec())
  }
}
