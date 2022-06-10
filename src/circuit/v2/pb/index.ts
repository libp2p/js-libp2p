/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message, bytes, uint64, uint32 } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface HopMessage {
  type: HopMessage.Type
  peer?: Peer
  reservation?: Reservation
  limit?: Limit
  status?: Status
}

export namespace HopMessage {
  export enum Type {
    RESERVE = 'RESERVE',
    CONNECT = 'CONNECT',
    STATUS = 'STATUS'
  }

  enum __TypeValues {
    RESERVE = 0,
    CONNECT = 1,
    STATUS = 2
  }

  export namespace Type {
    export const codec = () => {
      return enumeration<typeof Type>(__TypeValues)
    }
  }

  export const codec = (): Codec<HopMessage> => {
    return message<HopMessage>({
      1: { name: 'type', codec: HopMessage.Type.codec() },
      2: { name: 'peer', codec: Peer.codec(), optional: true },
      3: { name: 'reservation', codec: Reservation.codec(), optional: true },
      4: { name: 'limit', codec: Limit.codec(), optional: true },
      5: { name: 'status', codec: Status.codec(), optional: true }
    })
  }

  export const encode = (obj: HopMessage): Uint8Array => {
    return encodeMessage(obj, HopMessage.codec())
  }

  export const decode = (buf: Uint8Array): HopMessage => {
    return decodeMessage(buf, HopMessage.codec())
  }
}

export interface StopMessage {
  type: StopMessage.Type
  peer?: Peer
  limit?: Limit
  status?: Status
}

export namespace StopMessage {
  export enum Type {
    CONNECT = 'CONNECT',
    STATUS = 'STATUS'
  }

  enum __TypeValues {
    CONNECT = 0,
    STATUS = 1
  }

  export namespace Type {
    export const codec = () => {
      return enumeration<typeof Type>(__TypeValues)
    }
  }

  export const codec = (): Codec<StopMessage> => {
    return message<StopMessage>({
      1: { name: 'type', codec: StopMessage.Type.codec() },
      2: { name: 'peer', codec: Peer.codec(), optional: true },
      3: { name: 'limit', codec: Limit.codec(), optional: true },
      4: { name: 'status', codec: Status.codec(), optional: true }
    })
  }

  export const encode = (obj: StopMessage): Uint8Array => {
    return encodeMessage(obj, StopMessage.codec())
  }

  export const decode = (buf: Uint8Array): StopMessage => {
    return decodeMessage(buf, StopMessage.codec())
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

export interface Reservation {
  expire: bigint
  addrs: Uint8Array[]
  voucher?: Uint8Array
}

export namespace Reservation {
  export const codec = (): Codec<Reservation> => {
    return message<Reservation>({
      1: { name: 'expire', codec: uint64 },
      2: { name: 'addrs', codec: bytes, repeats: true },
      3: { name: 'voucher', codec: bytes, optional: true }
    })
  }

  export const encode = (obj: Reservation): Uint8Array => {
    return encodeMessage(obj, Reservation.codec())
  }

  export const decode = (buf: Uint8Array): Reservation => {
    return decodeMessage(buf, Reservation.codec())
  }
}

export interface Limit {
  duration?: number
  data?: bigint
}

export namespace Limit {
  export const codec = (): Codec<Limit> => {
    return message<Limit>({
      1: { name: 'duration', codec: uint32, optional: true },
      2: { name: 'data', codec: uint64, optional: true }
    })
  }

  export const encode = (obj: Limit): Uint8Array => {
    return encodeMessage(obj, Limit.codec())
  }

  export const decode = (buf: Uint8Array): Limit => {
    return decodeMessage(buf, Limit.codec())
  }
}

export enum Status {
  OK = 'OK',
  RESERVATION_REFUSED = 'RESERVATION_REFUSED',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NO_RESERVATION = 'NO_RESERVATION',
  MALFORMED_MESSAGE = 'MALFORMED_MESSAGE',
  UNEXPECTED_MESSAGE = 'UNEXPECTED_MESSAGE'
}

enum __StatusValues {
  OK = 100,
  RESERVATION_REFUSED = 200,
  RESOURCE_LIMIT_EXCEEDED = 201,
  PERMISSION_DENIED = 202,
  CONNECTION_FAILED = 203,
  NO_RESERVATION = 204,
  MALFORMED_MESSAGE = 400,
  UNEXPECTED_MESSAGE = 401
}

export namespace Status {
  export const codec = () => {
    return enumeration<typeof Status>(__StatusValues)
  }
}
export interface ReservationVoucher {
  relay: Uint8Array
  peer: Uint8Array
  expiration: bigint
}

export namespace ReservationVoucher {
  export const codec = (): Codec<ReservationVoucher> => {
    return message<ReservationVoucher>({
      1: { name: 'relay', codec: bytes },
      2: { name: 'peer', codec: bytes },
      3: { name: 'expiration', codec: uint64 }
    })
  }

  export const encode = (obj: ReservationVoucher): Uint8Array => {
    return encodeMessage(obj, ReservationVoucher.codec())
  }

  export const decode = (buf: Uint8Array): ReservationVoucher => {
    return decodeMessage(buf, ReservationVoucher.codec())
  }
}
