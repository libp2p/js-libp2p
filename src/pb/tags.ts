/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, string, uint32, uint64 } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface Tags {
  tags: Tag[]
}

export namespace Tags {
  export const codec = (): Codec<Tags> => {
    return message<Tags>({
      1: { name: 'tags', codec: Tag.codec(), repeats: true }
    })
  }

  export const encode = (obj: Tags): Uint8Array => {
    return encodeMessage(obj, Tags.codec())
  }

  export const decode = (buf: Uint8Array): Tags => {
    return decodeMessage(buf, Tags.codec())
  }
}

export interface Tag {
  name: string
  value?: number
  expiry?: bigint
}

export namespace Tag {
  export const codec = (): Codec<Tag> => {
    return message<Tag>({
      1: { name: 'name', codec: string },
      2: { name: 'value', codec: uint32, optional: true },
      3: { name: 'expiry', codec: uint64, optional: true }
    })
  }

  export const encode = (obj: Tag): Uint8Array => {
    return encodeMessage(obj, Tag.codec())
  }

  export const decode = (buf: Uint8Array): Tag => {
    return decodeMessage(buf, Tag.codec())
  }
}
