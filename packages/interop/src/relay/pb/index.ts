import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

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
          Peer.codec().encode(obj.peer, w)
        }

        if (obj.reservation != null) {
          w.uint32(26)
          Reservation.codec().encode(obj.reservation, w)
        }

        if (obj.limit != null) {
          w.uint32(34)
          Limit.codec().encode(obj.limit, w)
        }

        if (obj.status != null) {
          w.uint32(40)
          Status.codec().encode(obj.status, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = HopMessage.Type.codec().decode(reader)
              break
            }
            case 2: {
              obj.peer = Peer.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 3: {
              obj.reservation = Reservation.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.reservation
              })
              break
            }
            case 4: {
              obj.limit = Limit.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.limit
              })
              break
            }
            case 5: {
              obj.status = Status.codec().decode(reader)
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.type`,
                value: HopMessage.Type.codec().decode(reader)
              }
              break
            }
            case 2: {
              yield * Peer.codec().stream(reader, reader.uint32(), `${prefix}.peer`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 3: {
              yield * Reservation.codec().stream(reader, reader.uint32(), `${prefix}.reservation`, {
                limits: opts.limits?.reservation
              })

              break
            }
            case 4: {
              yield * Limit.codec().stream(reader, reader.uint32(), `${prefix}.limit`, {
                limits: opts.limits?.limit
              })

              break
            }
            case 5: {
              yield {
                field: `${prefix}.status`,
                value: Status.codec().decode(reader)
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface HopMessageTypeFieldEvent {
    field: '$.type'
    value: HopMessage.Type
  }

  export interface HopMessagePeerIdFieldEvent {
    field: '$.peer.id'
    value: Uint8Array
  }

  export interface HopMessagePeerAddrsFieldEvent {
    field: '$.peer.addrs[]'
    index: number
    value: Uint8Array
  }

  export interface HopMessageReservationExpireFieldEvent {
    field: '$.reservation.expire'
    value: bigint
  }

  export interface HopMessageReservationAddrsFieldEvent {
    field: '$.reservation.addrs[]'
    index: number
    value: Uint8Array
  }

  export interface HopMessageReservationVoucherFieldEvent {
    field: '$.reservation.voucher'
    value: Uint8Array
  }

  export interface HopMessageLimitDurationFieldEvent {
    field: '$.limit.duration'
    value: number
  }

  export interface HopMessageLimitDataFieldEvent {
    field: '$.limit.data'
    value: bigint
  }

  export interface HopMessageStatusFieldEvent {
    field: '$.status'
    value: Status
  }

  export function encode (obj: Partial<HopMessage>): Uint8Array {
    return encodeMessage(obj, HopMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopMessage>): HopMessage {
    return decodeMessage(buf, HopMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopMessage>): Generator<HopMessageTypeFieldEvent | HopMessagePeerIdFieldEvent | HopMessagePeerAddrsFieldEvent | HopMessageReservationExpireFieldEvent | HopMessageReservationAddrsFieldEvent | HopMessageReservationVoucherFieldEvent | HopMessageLimitDurationFieldEvent | HopMessageLimitDataFieldEvent | HopMessageStatusFieldEvent> {
    return streamMessage(buf, HopMessage.codec(), opts)
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
          Peer.codec().encode(obj.peer, w)
        }

        if (obj.limit != null) {
          w.uint32(26)
          Limit.codec().encode(obj.limit, w)
        }

        if (obj.status != null) {
          w.uint32(32)
          Status.codec().encode(obj.status, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = StopMessage.Type.codec().decode(reader)
              break
            }
            case 2: {
              obj.peer = Peer.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 3: {
              obj.limit = Limit.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.limit
              })
              break
            }
            case 4: {
              obj.status = Status.codec().decode(reader)
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.type`,
                value: StopMessage.Type.codec().decode(reader)
              }
              break
            }
            case 2: {
              yield * Peer.codec().stream(reader, reader.uint32(), `${prefix}.peer`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 3: {
              yield * Limit.codec().stream(reader, reader.uint32(), `${prefix}.limit`, {
                limits: opts.limits?.limit
              })

              break
            }
            case 4: {
              yield {
                field: `${prefix}.status`,
                value: Status.codec().decode(reader)
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface StopMessageTypeFieldEvent {
    field: '$.type'
    value: StopMessage.Type
  }

  export interface StopMessagePeerIdFieldEvent {
    field: '$.peer.id'
    value: Uint8Array
  }

  export interface StopMessagePeerAddrsFieldEvent {
    field: '$.peer.addrs[]'
    index: number
    value: Uint8Array
  }

  export interface StopMessageLimitDurationFieldEvent {
    field: '$.limit.duration'
    value: number
  }

  export interface StopMessageLimitDataFieldEvent {
    field: '$.limit.data'
    value: bigint
  }

  export interface StopMessageStatusFieldEvent {
    field: '$.status'
    value: Status
  }

  export function encode (obj: Partial<StopMessage>): Uint8Array {
    return encodeMessage(obj, StopMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StopMessage>): StopMessage {
    return decodeMessage(buf, StopMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StopMessage>): Generator<StopMessageTypeFieldEvent | StopMessagePeerIdFieldEvent | StopMessagePeerAddrsFieldEvent | StopMessageLimitDurationFieldEvent | StopMessageLimitDataFieldEvent | StopMessageStatusFieldEvent> {
    return streamMessage(buf, StopMessage.codec(), opts)
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

        if ((obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          addrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.id = reader.bytes()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(reader.bytes())
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.id`,
                value: reader.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}.addrs[]`,
                index: obj.addrs,
                value: reader.bytes()
              }

              obj.addrs++

              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface PeerIdFieldEvent {
    field: '$.id'
    value: Uint8Array
  }

  export interface PeerAddrsFieldEvent {
    field: '$.addrs[]'
    index: number
    value: Uint8Array
  }

  export function encode (obj: Partial<Peer>): Uint8Array {
    return encodeMessage(obj, Peer.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer>): Peer {
    return decodeMessage(buf, Peer.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer>): Generator<PeerIdFieldEvent | PeerAddrsFieldEvent> {
    return streamMessage(buf, Peer.codec(), opts)
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

        if ((obj.expire != null && obj.expire !== 0n)) {
          w.uint32(8)
          w.uint64(obj.expire)
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          expire: 0n,
          addrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.expire = reader.uint64()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(reader.bytes())
              break
            }
            case 3: {
              obj.voucher = reader.bytes()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.expire`,
                value: reader.uint64()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}.addrs[]`,
                index: obj.addrs,
                value: reader.bytes()
              }

              obj.addrs++

              break
            }
            case 3: {
              yield {
                field: `${prefix}.voucher`,
                value: reader.bytes()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface ReservationExpireFieldEvent {
    field: '$.expire'
    value: bigint
  }

  export interface ReservationAddrsFieldEvent {
    field: '$.addrs[]'
    index: number
    value: Uint8Array
  }

  export interface ReservationVoucherFieldEvent {
    field: '$.voucher'
    value: Uint8Array
  }

  export function encode (obj: Partial<Reservation>): Uint8Array {
    return encodeMessage(obj, Reservation.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Reservation>): Reservation {
    return decodeMessage(buf, Reservation.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Reservation>): Generator<ReservationExpireFieldEvent | ReservationAddrsFieldEvent | ReservationVoucherFieldEvent> {
    return streamMessage(buf, Reservation.codec(), opts)
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
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.duration = reader.uint32()
              break
            }
            case 2: {
              obj.data = reader.uint64()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.duration`,
                value: reader.uint32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.data`,
                value: reader.uint64()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface LimitDurationFieldEvent {
    field: '$.duration'
    value: number
  }

  export interface LimitDataFieldEvent {
    field: '$.data'
    value: bigint
  }

  export function encode (obj: Partial<Limit>): Uint8Array {
    return encodeMessage(obj, Limit.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Limit>): Limit {
    return decodeMessage(buf, Limit.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Limit>): Generator<LimitDurationFieldEvent | LimitDataFieldEvent> {
    return streamMessage(buf, Limit.codec(), opts)
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

        if ((obj.relay != null && obj.relay.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.relay)
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.peer)
        }

        if ((obj.expiration != null && obj.expiration !== 0n)) {
          w.uint32(24)
          w.uint64(obj.expiration)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          relay: uint8ArrayAlloc(0),
          peer: uint8ArrayAlloc(0),
          expiration: 0n
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.relay = reader.bytes()
              break
            }
            case 2: {
              obj.peer = reader.bytes()
              break
            }
            case 3: {
              obj.expiration = reader.uint64()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.relay`,
                value: reader.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.peer`,
                value: reader.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}.expiration`,
                value: reader.uint64()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface ReservationVoucherRelayFieldEvent {
    field: '$.relay'
    value: Uint8Array
  }

  export interface ReservationVoucherPeerFieldEvent {
    field: '$.peer'
    value: Uint8Array
  }

  export interface ReservationVoucherExpirationFieldEvent {
    field: '$.expiration'
    value: bigint
  }

  export function encode (obj: Partial<ReservationVoucher>): Uint8Array {
    return encodeMessage(obj, ReservationVoucher.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ReservationVoucher>): ReservationVoucher {
    return decodeMessage(buf, ReservationVoucher.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ReservationVoucher>): Generator<ReservationVoucherRelayFieldEvent | ReservationVoucherPeerFieldEvent | ReservationVoucherExpirationFieldEvent> {
    return streamMessage(buf, ReservationVoucher.codec(), opts)
  }
}
