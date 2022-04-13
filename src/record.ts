/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes, string } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface Record {
  key: Uint8Array
  value: Uint8Array
  timeReceived: string
}

export namespace Record {
  export const codec = (): Codec<Record> => {
    return message<Record>({
      1: { name: 'key', codec: bytes },
      2: { name: 'value', codec: bytes },
      5: { name: 'timeReceived', codec: string }
    })
  }

  export const encode = (obj: Record): Uint8Array => {
    return encodeMessage(obj, Record.codec())
  }

  export const decode = (buf: Uint8Array): Record => {
    return decodeMessage(buf, Record.codec())
  }
}
