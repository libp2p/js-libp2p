/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message, bytes } from 'protons-runtime'

export interface CircuitRelay {
  type?: CircuitRelay.Type
  srcPeer?: CircuitRelay.Peer
  dstPeer?: CircuitRelay.Peer
  code?: CircuitRelay.Status
}

export namespace CircuitRelay {
  export enum Status {
    SUCCESS = 'SUCCESS',
    HOP_SRC_ADDR_TOO_LONG = 'HOP_SRC_ADDR_TOO_LONG',
    HOP_DST_ADDR_TOO_LONG = 'HOP_DST_ADDR_TOO_LONG',
    HOP_SRC_MULTIADDR_INVALID = 'HOP_SRC_MULTIADDR_INVALID',
    HOP_DST_MULTIADDR_INVALID = 'HOP_DST_MULTIADDR_INVALID',
    HOP_NO_CONN_TO_DST = 'HOP_NO_CONN_TO_DST',
    HOP_CANT_DIAL_DST = 'HOP_CANT_DIAL_DST',
    HOP_CANT_OPEN_DST_STREAM = 'HOP_CANT_OPEN_DST_STREAM',
    HOP_CANT_SPEAK_RELAY = 'HOP_CANT_SPEAK_RELAY',
    HOP_CANT_RELAY_TO_SELF = 'HOP_CANT_RELAY_TO_SELF',
    STOP_SRC_ADDR_TOO_LONG = 'STOP_SRC_ADDR_TOO_LONG',
    STOP_DST_ADDR_TOO_LONG = 'STOP_DST_ADDR_TOO_LONG',
    STOP_SRC_MULTIADDR_INVALID = 'STOP_SRC_MULTIADDR_INVALID',
    STOP_DST_MULTIADDR_INVALID = 'STOP_DST_MULTIADDR_INVALID',
    STOP_RELAY_REFUSED = 'STOP_RELAY_REFUSED',
    MALFORMED_MESSAGE = 'MALFORMED_MESSAGE'
  }

  export namespace Status {
    export const codec = () => {
      return enumeration<typeof Status>(Status)
    }
  }
  export enum Type {
    HOP = 'HOP',
    STOP = 'STOP',
    STATUS = 'STATUS',
    CAN_HOP = 'CAN_HOP'
  }

  export namespace Type {
    export const codec = () => {
      return enumeration<typeof Type>(Type)
    }
  }
  export interface Peer {
    id: Uint8Array
    addrs: Uint8Array[]
  }

  export namespace Peer {
    export const codec = () => {
      return message<Peer>({
        1: { name: 'id', codec: bytes },
        2: { name: 'addrs', codec: bytes, repeats: true }
      })
    }

    export const encode = (obj: Peer): Uint8Array => {
      return encodeMessage(obj, Peer.codec())
    }

    export const decode = (buf: Uint8Array): Peer => {
      return decodeMessage(buf, Peer.codec())
    }
  }

  export const codec = () => {
    return message<CircuitRelay>({
      1: { name: 'type', codec: CircuitRelay.Type.codec(), optional: true },
      2: { name: 'srcPeer', codec: CircuitRelay.Peer.codec(), optional: true },
      3: { name: 'dstPeer', codec: CircuitRelay.Peer.codec(), optional: true },
      4: { name: 'code', codec: CircuitRelay.Status.codec(), optional: true }
    })
  }

  export const encode = (obj: CircuitRelay): Uint8Array => {
    return encodeMessage(obj, CircuitRelay.codec())
  }

  export const decode = (buf: Uint8Array): CircuitRelay => {
    return decodeMessage(buf, CircuitRelay.codec())
  }
}
