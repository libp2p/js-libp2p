/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, string, bytes } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface Identify {
  protocolVersion?: string
  agentVersion?: string
  publicKey?: Uint8Array
  listenAddrs: Uint8Array[]
  observedAddr?: Uint8Array
  protocols: string[]
  signedPeerRecord?: Uint8Array
}

export namespace Identify {
  export const codec = (): Codec<Identify> => {
    return message<Identify>({
      5: { name: 'protocolVersion', codec: string, optional: true },
      6: { name: 'agentVersion', codec: string, optional: true },
      1: { name: 'publicKey', codec: bytes, optional: true },
      2: { name: 'listenAddrs', codec: bytes, repeats: true },
      4: { name: 'observedAddr', codec: bytes, optional: true },
      3: { name: 'protocols', codec: string, repeats: true },
      8: { name: 'signedPeerRecord', codec: bytes, optional: true }
    })
  }

  export const encode = (obj: Identify): Uint8Array => {
    return encodeMessage(obj, Identify.codec())
  }

  export const decode = (buf: Uint8Array): Identify => {
    return decodeMessage(buf, Identify.codec())
  }
}
