/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PeerIdProto {
  id: Uint8Array
  pubKey?: Uint8Array
  privKey?: Uint8Array
}

export namespace PeerIdProto {
  export const codec = (): Codec<PeerIdProto> => {
    return message<PeerIdProto>({
      1: { name: 'id', codec: bytes },
      2: { name: 'pubKey', codec: bytes, optional: true },
      3: { name: 'privKey', codec: bytes, optional: true }
    })
  }

  export const encode = (obj: PeerIdProto): Uint8ArrayList => {
    return encodeMessage(obj, PeerIdProto.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerIdProto => {
    return decodeMessage(buf, PeerIdProto.codec())
  }
}
