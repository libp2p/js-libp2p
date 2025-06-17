import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<HopMessage>): Uint8Array => {
    return encodeMessage(obj, HopMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopMessage>): HopMessage => {
    return decodeMessage(buf, HopMessage.codec(), opts)
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<StopMessage>): Uint8Array => {
    return encodeMessage(obj, StopMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StopMessage>): StopMessage => {
    return decodeMessage(buf, StopMessage.codec(), opts)
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

        if (obj.addrs != null) {
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
                throw new MaxLengthError('Decode error - map field "addrs" had too many elements')
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Peer>): Uint8Array => {
    return encodeMessage(obj, Peer.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Peer>): Peer => {
    return decodeMessage(buf, Peer.codec(), opts)
  }
}

export interface Reservation {
  expire: bigint
  addrs: Uint8Array[]
  voucher?: Envelope
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

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.voucher != null) {
          w.uint32(26)
          Envelope.codec().encode(obj.voucher, w)
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
                throw new MaxLengthError('Decode error - map field "addrs" had too many elements')
              }

              obj.addrs.push(reader.bytes())
              break
            }
            case 3: {
              obj.voucher = Envelope.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.voucher
              })
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Reservation>): Uint8Array => {
    return encodeMessage(obj, Reservation.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Reservation>): Reservation => {
    return decodeMessage(buf, Reservation.codec(), opts)
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Limit>): Uint8Array => {
    return encodeMessage(obj, Limit.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Limit>): Limit => {
    return decodeMessage(buf, Limit.codec(), opts)
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
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<ReservationVoucher>): Uint8Array => {
    return encodeMessage(obj, ReservationVoucher.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ReservationVoucher>): ReservationVoucher => {
    return decodeMessage(buf, ReservationVoucher.codec(), opts)
  }
}

export interface Envelope {
  publicKey: Uint8Array
  payloadType: Uint8Array
  payload?: ReservationVoucher
  signature: Uint8Array
}

export namespace Envelope {
  let _codec: Codec<Envelope>

  export const codec = (): Codec<Envelope> => {
    if (_codec == null) {
      _codec = message<Envelope>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.publicKey != null && obj.publicKey.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.publicKey)
        }

        if ((obj.payloadType != null && obj.payloadType.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.payloadType)
        }

        if (obj.payload != null) {
          w.uint32(26)
          ReservationVoucher.codec().encode(obj.payload, w)
        }

        if ((obj.signature != null && obj.signature.byteLength > 0)) {
          w.uint32(42)
          w.bytes(obj.signature)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          publicKey: uint8ArrayAlloc(0),
          payloadType: uint8ArrayAlloc(0),
          signature: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.publicKey = reader.bytes()
              break
            }
            case 2: {
              obj.payloadType = reader.bytes()
              break
            }
            case 3: {
              obj.payload = ReservationVoucher.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.payload
              })
              break
            }
            case 5: {
              obj.signature = reader.bytes()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<Envelope>): Uint8Array => {
    return encodeMessage(obj, Envelope.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Envelope => {
    return decodeMessage(buf, Envelope.codec(), opts)
  }
}
