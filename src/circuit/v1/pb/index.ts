/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message, bytes } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

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

  enum __StatusValues {
    SUCCESS = 100,
    HOP_SRC_ADDR_TOO_LONG = 220,
    HOP_DST_ADDR_TOO_LONG = 221,
    HOP_SRC_MULTIADDR_INVALID = 250,
    HOP_DST_MULTIADDR_INVALID = 251,
    HOP_NO_CONN_TO_DST = 260,
    HOP_CANT_DIAL_DST = 261,
    HOP_CANT_OPEN_DST_STREAM = 262,
    HOP_CANT_SPEAK_RELAY = 270,
    HOP_CANT_RELAY_TO_SELF = 280,
    STOP_SRC_ADDR_TOO_LONG = 320,
    STOP_DST_ADDR_TOO_LONG = 321,
    STOP_SRC_MULTIADDR_INVALID = 350,
    STOP_DST_MULTIADDR_INVALID = 351,
    STOP_RELAY_REFUSED = 390,
    MALFORMED_MESSAGE = 400
  }

  export namespace Status {
    export const codec = () => {
      return enumeration<typeof Status>(__StatusValues)
    }
  }

  export enum Type {
    HOP = 'HOP',
    STOP = 'STOP',
    STATUS = 'STATUS',
    CAN_HOP = 'CAN_HOP'
  }

  enum __TypeValues {
    HOP = 1,
    STOP = 2,
    STATUS = 3,
    CAN_HOP = 4
  }

  export namespace Type {
    export const codec = () => {
      return enumeration<typeof Type>(__TypeValues)
    }
  }

  export interface Peer {
    id: Uint8Array
    addrs: Uint8Array[]
  }

  export namespace Peer {
    export const codec = (): Codec<Peer> => {
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

  export const codec = (): Codec<CircuitRelay> => {
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
