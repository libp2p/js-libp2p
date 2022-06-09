/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes, uint64 } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface PeerRecord {
  peerId: Uint8Array
  seq: bigint
  addresses: PeerRecord.AddressInfo[]
}

export namespace PeerRecord {
  export interface AddressInfo {
    multiaddr: Uint8Array
  }

  export namespace AddressInfo {
    export const codec = (): Codec<AddressInfo> => {
      return message<AddressInfo>({
        1: { name: 'multiaddr', codec: bytes }
      })
    }

    export const encode = (obj: AddressInfo): Uint8Array => {
      return encodeMessage(obj, AddressInfo.codec())
    }

    export const decode = (buf: Uint8Array): AddressInfo => {
      return decodeMessage(buf, AddressInfo.codec())
    }
  }

  export const codec = (): Codec<PeerRecord> => {
    return message<PeerRecord>({
      1: { name: 'peerId', codec: bytes },
      2: { name: 'seq', codec: uint64 },
      3: { name: 'addresses', codec: PeerRecord.AddressInfo.codec(), repeats: true }
    })
  }

  export const encode = (obj: PeerRecord): Uint8Array => {
    return encodeMessage(obj, PeerRecord.codec())
  }

  export const decode = (buf: Uint8Array): PeerRecord => {
    return decodeMessage(buf, PeerRecord.codec())
  }
}
