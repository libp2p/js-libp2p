/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface Envelope {
  publicKey: Uint8Array
  payloadType: Uint8Array
  payload: Uint8Array
  signature: Uint8Array
}

export namespace Envelope {
  export const codec = (): Codec<Envelope> => {
    return message<Envelope>({
      1: { name: 'publicKey', codec: bytes },
      2: { name: 'payloadType', codec: bytes },
      3: { name: 'payload', codec: bytes },
      5: { name: 'signature', codec: bytes }
    })
  }

  export const encode = (obj: Envelope): Uint8Array => {
    return encodeMessage(obj, Envelope.codec())
  }

  export const decode = (buf: Uint8Array): Envelope => {
    return decodeMessage(buf, Envelope.codec())
  }
}
