/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
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
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<HopMessage>

  export const codec = (): Codec<HopMessage> => {
    if (_codec == null) {
      _codec = message<HopMessage>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.type != null) {
          writer.uint32(8)
          HopMessage.Type.codec().encode(obj.type, writer)
        } else {
          throw new Error('Protocol error: required field "type" was not found in object')
        }

        if (obj.peer != null) {
          writer.uint32(18)
          Peer.codec().encode(obj.peer, writer)
        }

        if (obj.reservation != null) {
          writer.uint32(26)
          Reservation.codec().encode(obj.reservation, writer)
        }

        if (obj.limit != null) {
          writer.uint32(34)
          Limit.codec().encode(obj.limit, writer)
        }

        if (obj.status != null) {
          writer.uint32(40)
          Status.codec().encode(obj.status, writer)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          type: Type.RESERVE
        }

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

        if (obj.type == null) {
          throw new Error('Protocol error: value for required field "type" was not found in protobuf')
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
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<StopMessage>

  export const codec = (): Codec<StopMessage> => {
    if (_codec == null) {
      _codec = message<StopMessage>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.type != null) {
          writer.uint32(8)
          StopMessage.Type.codec().encode(obj.type, writer)
        } else {
          throw new Error('Protocol error: required field "type" was not found in object')
        }

        if (obj.peer != null) {
          writer.uint32(18)
          Peer.codec().encode(obj.peer, writer)
        }

        if (obj.limit != null) {
          writer.uint32(26)
          Limit.codec().encode(obj.limit, writer)
        }

        if (obj.status != null) {
          writer.uint32(32)
          Status.codec().encode(obj.status, writer)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          type: Type.CONNECT
        }

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

        if (obj.type == null) {
          throw new Error('Protocol error: value for required field "type" was not found in protobuf')
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
      _codec = message<Peer>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.id != null) {
          writer.uint32(10)
          writer.bytes(obj.id)
        } else {
          throw new Error('Protocol error: required field "id" was not found in object')
        }

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            writer.uint32(18)
            writer.bytes(value)
          }
        } else {
          throw new Error('Protocol error: required field "addrs" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

        if (obj.id == null) {
          throw new Error('Protocol error: value for required field "id" was not found in protobuf')
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
      _codec = message<Reservation>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.expire != null) {
          writer.uint32(8)
          writer.uint64(obj.expire)
        } else {
          throw new Error('Protocol error: required field "expire" was not found in object')
        }

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            writer.uint32(18)
            writer.bytes(value)
          }
        } else {
          throw new Error('Protocol error: required field "addrs" was not found in object')
        }

        if (obj.voucher != null) {
          writer.uint32(26)
          writer.bytes(obj.voucher)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

        if (obj.expire == null) {
          throw new Error('Protocol error: value for required field "expire" was not found in protobuf')
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
      _codec = message<Limit>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.duration != null) {
          writer.uint32(8)
          writer.uint32(obj.duration)
        }

        if (obj.data != null) {
          writer.uint32(16)
          writer.uint64(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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
      _codec = message<ReservationVoucher>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.relay != null) {
          writer.uint32(10)
          writer.bytes(obj.relay)
        } else {
          throw new Error('Protocol error: required field "relay" was not found in object')
        }

        if (obj.peer != null) {
          writer.uint32(18)
          writer.bytes(obj.peer)
        } else {
          throw new Error('Protocol error: required field "peer" was not found in object')
        }

        if (obj.expiration != null) {
          writer.uint32(24)
          writer.uint64(obj.expiration)
        } else {
          throw new Error('Protocol error: required field "expiration" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

        if (obj.relay == null) {
          throw new Error('Protocol error: value for required field "relay" was not found in protobuf')
        }

        if (obj.peer == null) {
          throw new Error('Protocol error: value for required field "peer" was not found in protobuf')
        }

        if (obj.expiration == null) {
          throw new Error('Protocol error: value for required field "expiration" was not found in protobuf')
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
