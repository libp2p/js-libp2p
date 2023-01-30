/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface HopMessage {
  type?: HopMessage.Type
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
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<HopMessage>

  export const codec = (): Codec<HopMessage> => {
    if (_codec == null) {
      _codec = message<HopMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          HopMessage.Type.codec().encode(obj.type, w)
        }

        if (obj.peer != null) {
          w.uint32(18)
          Peer.codec().encode(obj.peer, w, {
            writeDefaults: false
          })
        }

        if (obj.reservation != null) {
          w.uint32(26)
          Reservation.codec().encode(obj.reservation, w, {
            writeDefaults: false
          })
        }

        if (obj.limit != null) {
          w.uint32(34)
          Limit.codec().encode(obj.limit, w, {
            writeDefaults: false
          })
        }

        if (obj.status != null) {
          w.uint32(40)
          Status.codec().encode(obj.status, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = HopMessage.Type.codec().decode(reader)
              break
            case 2:
              obj.peer = Peer.codec().decode(reader, reader.uint32())
              break
            case 3:
              obj.reservation = Reservation.codec().decode(reader, reader.uint32())
              break
            case 4:
              obj.limit = Limit.codec().decode(reader, reader.uint32())
              break
            case 5:
              obj.status = Status.codec().decode(reader)
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

  export const encode = (obj: HopMessage): Uint8Array => {
    return encodeMessage(obj, HopMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): HopMessage => {
    return decodeMessage(buf, HopMessage.codec())
  }
}

export interface StopMessage {
  type?: StopMessage.Type
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
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<StopMessage>

  export const codec = (): Codec<StopMessage> => {
    if (_codec == null) {
      _codec = message<StopMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          StopMessage.Type.codec().encode(obj.type, w)
        }

        if (obj.peer != null) {
          w.uint32(18)
          Peer.codec().encode(obj.peer, w, {
            writeDefaults: false
          })
        }

        if (obj.limit != null) {
          w.uint32(26)
          Limit.codec().encode(obj.limit, w, {
            writeDefaults: false
          })
        }

        if (obj.status != null) {
          w.uint32(32)
          Status.codec().encode(obj.status, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = StopMessage.Type.codec().decode(reader)
              break
            case 2:
              obj.peer = Peer.codec().decode(reader, reader.uint32())
              break
            case 3:
              obj.limit = Limit.codec().decode(reader, reader.uint32())
              break
            case 4:
              obj.status = Status.codec().decode(reader)
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

  export const encode = (obj: StopMessage): Uint8Array => {
    return encodeMessage(obj, StopMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): StopMessage => {
    return decodeMessage(buf, StopMessage.codec())
  }
}

export interface Peer {
  id: Uint8Array
  addrs: Uint8Array[]
}

export namespace Peer {
  let _codec: Codec<Peer>

  export const codec = (): Codec<Peer> => {
    if (_codec == null) {
      _codec = message<Peer>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || (obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          id: new Uint8Array(0),
          addrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.id = reader.bytes()
              break
            case 2:
              obj.addrs.push(reader.bytes())
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

  export const encode = (obj: Peer): Uint8Array => {
    return encodeMessage(obj, Peer.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Peer => {
    return decodeMessage(buf, Peer.codec())
  }
}

export interface Reservation {
  expire: bigint
  addrs: Uint8Array[]
  voucher?: Uint8Array
}

export namespace Reservation {
  let _codec: Codec<Reservation>

  export const codec = (): Codec<Reservation> => {
    if (_codec == null) {
      _codec = message<Reservation>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || obj.expire !== 0n) {
          w.uint32(8)
          w.uint64(obj.expire)
        }

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.voucher != null) {
          w.uint32(26)
          w.bytes(obj.voucher)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          expire: 0n,
          addrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.expire = reader.uint64()
              break
            case 2:
              obj.addrs.push(reader.bytes())
              break
            case 3:
              obj.voucher = reader.bytes()
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

  export const encode = (obj: Reservation): Uint8Array => {
    return encodeMessage(obj, Reservation.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Reservation => {
    return decodeMessage(buf, Reservation.codec())
  }
}

export interface Limit {
  duration?: number
  data?: bigint
}

export namespace Limit {
  let _codec: Codec<Limit>

  export const codec = (): Codec<Limit> => {
    if (_codec == null) {
      _codec = message<Limit>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.duration != null) {
          w.uint32(8)
          w.uint32(obj.duration)
        }

        if (obj.data != null) {
          w.uint32(16)
          w.uint64(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.duration = reader.uint32()
              break
            case 2:
              obj.data = reader.uint64()
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

  export const encode = (obj: Limit): Uint8Array => {
    return encodeMessage(obj, Limit.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Limit => {
    return decodeMessage(buf, Limit.codec())
  }
}

export enum Status {
  UNUSED = 'UNUSED',
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
  UNUSED = 0,
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
  export const codec = (): Codec<Status> => {
    return enumeration<Status>(__StatusValues)
  }
}
export interface ReservationVoucher {
  relay: Uint8Array
  peer: Uint8Array
  expiration: bigint
}

export namespace ReservationVoucher {
  let _codec: Codec<ReservationVoucher>

  export const codec = (): Codec<ReservationVoucher> => {
    if (_codec == null) {
      _codec = message<ReservationVoucher>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || (obj.relay != null && obj.relay.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.relay)
        }

        if (opts.writeDefaults === true || (obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.peer)
        }

        if (opts.writeDefaults === true || obj.expiration !== 0n) {
          w.uint32(24)
          w.uint64(obj.expiration)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          relay: new Uint8Array(0),
          peer: new Uint8Array(0),
          expiration: 0n
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.relay = reader.bytes()
              break
            case 2:
              obj.peer = reader.bytes()
              break
            case 3:
              obj.expiration = reader.uint64()
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

  export const encode = (obj: ReservationVoucher): Uint8Array => {
    return encodeMessage(obj, ReservationVoucher.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ReservationVoucher => {
    return decodeMessage(buf, ReservationVoucher.codec())
  }
}
