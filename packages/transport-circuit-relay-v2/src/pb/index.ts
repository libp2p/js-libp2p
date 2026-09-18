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

export interface HopMessageInput {
  type?: HopMessage.Type
  peer?: PeerInput
  reservation?: ReservationInput
  limit?: LimitInput
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<HopMessage, HopMessageInput>

  export const codec = (): Codec<HopMessage, HopMessageInput> => {
    if (_codec == null) {
      _codec = message<HopMessage, HopMessageInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = HopMessage.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.peer = Peer.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 3: {
              obj.reservation = Reservation.codec().decode(r, r.uint32(), {
                limits: opts.limits?.reservation
              })
              break
            }
            case 4: {
              obj.limit = Limit.codec().decode(r, r.uint32(), {
                limits: opts.limits?.limit
              })
              break
            }
            case 5: {
              obj.status = Status.codec().decode(r)
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'HopMessage'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: HopMessage.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * Peer.codec().stream(r, r.uint32(), `${prefix}peer.`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 3: {
              yield * Reservation.codec().stream(r, r.uint32(), `${prefix}reservation.`, {
                limits: opts.limits?.reservation
              })

              break
            }
            case 4: {
              yield * Limit.codec().stream(r, r.uint32(), `${prefix}limit.`, {
                limits: opts.limits?.limit
              })

              break
            }
            case 5: {
              yield {
                field: `${prefix}status`,
                value: Status.codec().decode(r)
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'HopMessage'
          }
        }
      })
    }

    return _codec
  }

  export interface HopMessageTypeFieldEvent {
    field: '.type'
    value: HopMessage.Type
  }

  export interface HopMessagePeerMessageStart {
    field: '.peer'
    type: 'start'
  }

  export interface HopMessagePeerMessageEnd {
    field: '.peer'
    type: 'end'
  }

  export interface HopMessagePeerIdFieldEvent {
    field: '.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessagePeerAddrsFieldEvent {
    field: '.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationMessageStart {
    field: '.reservation'
    type: 'start'
  }

  export interface HopMessageReservationMessageEnd {
    field: '.reservation'
    type: 'end'
  }

  export interface HopMessageReservationExpireFieldEvent {
    field: '.reservation.expire'
    value: bigint
  }

  export interface HopMessageReservationAddrsFieldEvent {
    field: '.reservation.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationVoucherMessageStart {
    field: '.reservation.voucher'
    type: 'start'
  }

  export interface HopMessageReservationVoucherMessageEnd {
    field: '.reservation.voucher'
    type: 'end'
  }

  export interface HopMessageReservationVoucherPublicKeyFieldEvent {
    field: '.reservation.voucher.publicKey'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationVoucherPayloadTypeFieldEvent {
    field: '.reservation.voucher.payloadType'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationVoucherPayloadMessageStart {
    field: '.reservation.voucher.payload'
    type: 'start'
  }

  export interface HopMessageReservationVoucherPayloadMessageEnd {
    field: '.reservation.voucher.payload'
    type: 'end'
  }

  export interface HopMessageReservationVoucherPayloadRelayFieldEvent {
    field: '.reservation.voucher.payload.relay'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationVoucherPayloadPeerFieldEvent {
    field: '.reservation.voucher.payload.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageReservationVoucherPayloadExpirationFieldEvent {
    field: '.reservation.voucher.payload.expiration'
    value: bigint
  }

  export interface HopMessageReservationVoucherSignatureFieldEvent {
    field: '.reservation.voucher.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export interface HopMessageLimitMessageStart {
    field: '.limit'
    type: 'start'
  }

  export interface HopMessageLimitMessageEnd {
    field: '.limit'
    type: 'end'
  }

  export interface HopMessageLimitDurationFieldEvent {
    field: '.limit.duration'
    value: number
  }

  export interface HopMessageLimitDataFieldEvent {
    field: '.limit.data'
    value: bigint
  }

  export interface HopMessageStatusFieldEvent {
    field: '.status'
    value: Status
  }

  export function encode (obj: HopMessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, HopMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopMessage>): HopMessage {
    return decodeMessage(buf, HopMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HopMessage>): Generator<HopMessageTypeFieldEvent | HopMessagePeerMessageStart | HopMessagePeerMessageEnd | HopMessagePeerIdFieldEvent | HopMessagePeerAddrsFieldEvent | HopMessageReservationMessageStart | HopMessageReservationMessageEnd | HopMessageReservationExpireFieldEvent | HopMessageReservationAddrsFieldEvent | HopMessageReservationVoucherMessageStart | HopMessageReservationVoucherMessageEnd | HopMessageReservationVoucherPublicKeyFieldEvent | HopMessageReservationVoucherPayloadTypeFieldEvent | HopMessageReservationVoucherPayloadMessageStart | HopMessageReservationVoucherPayloadMessageEnd | HopMessageReservationVoucherPayloadRelayFieldEvent | HopMessageReservationVoucherPayloadPeerFieldEvent | HopMessageReservationVoucherPayloadExpirationFieldEvent | HopMessageReservationVoucherSignatureFieldEvent | HopMessageLimitMessageStart | HopMessageLimitMessageEnd | HopMessageLimitDurationFieldEvent | HopMessageLimitDataFieldEvent | HopMessageStatusFieldEvent> {
    return streamMessage(buf, HopMessage.codec(), opts)
  }
}

export interface StopMessage {
  type?: StopMessage.Type
  peer?: Peer
  limit?: Limit
  status?: Status
}

export interface StopMessageInput {
  type?: StopMessage.Type
  peer?: PeerInput
  limit?: LimitInput
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<StopMessage, StopMessageInput>

  export const codec = (): Codec<StopMessage, StopMessageInput> => {
    if (_codec == null) {
      _codec = message<StopMessage, StopMessageInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = StopMessage.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.peer = Peer.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 3: {
              obj.limit = Limit.codec().decode(r, r.uint32(), {
                limits: opts.limits?.limit
              })
              break
            }
            case 4: {
              obj.status = Status.codec().decode(r)
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'StopMessage'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: StopMessage.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * Peer.codec().stream(r, r.uint32(), `${prefix}peer.`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 3: {
              yield * Limit.codec().stream(r, r.uint32(), `${prefix}limit.`, {
                limits: opts.limits?.limit
              })

              break
            }
            case 4: {
              yield {
                field: `${prefix}status`,
                value: Status.codec().decode(r)
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'StopMessage'
          }
        }
      })
    }

    return _codec
  }

  export interface StopMessageTypeFieldEvent {
    field: '.type'
    value: StopMessage.Type
  }

  export interface StopMessagePeerMessageStart {
    field: '.peer'
    type: 'start'
  }

  export interface StopMessagePeerMessageEnd {
    field: '.peer'
    type: 'end'
  }

  export interface StopMessagePeerIdFieldEvent {
    field: '.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface StopMessagePeerAddrsFieldEvent {
    field: '.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface StopMessageLimitMessageStart {
    field: '.limit'
    type: 'start'
  }

  export interface StopMessageLimitMessageEnd {
    field: '.limit'
    type: 'end'
  }

  export interface StopMessageLimitDurationFieldEvent {
    field: '.limit.duration'
    value: number
  }

  export interface StopMessageLimitDataFieldEvent {
    field: '.limit.data'
    value: bigint
  }

  export interface StopMessageStatusFieldEvent {
    field: '.status'
    value: Status
  }

  export function encode (obj: StopMessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, StopMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StopMessage>): StopMessage {
    return decodeMessage(buf, StopMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StopMessage>): Generator<StopMessageTypeFieldEvent | StopMessagePeerMessageStart | StopMessagePeerMessageEnd | StopMessagePeerIdFieldEvent | StopMessagePeerAddrsFieldEvent | StopMessageLimitMessageStart | StopMessageLimitMessageEnd | StopMessageLimitDurationFieldEvent | StopMessageLimitDataFieldEvent | StopMessageStatusFieldEvent> {
    return streamMessage(buf, StopMessage.codec(), opts)
  }
}

export interface Peer {
  id: Uint8Array<ArrayBuffer>
  addrs: Uint8Array<ArrayBuffer>[]
}

export interface PeerInput {
  id?: Uint8Array
  addrs?: Uint8Array[]
}

export namespace Peer {
  let _codec: Codec<Peer, PeerInput>

  export const codec = (): Codec<Peer, PeerInput> => {
    if (_codec == null) {
      _codec = message<Peer, PeerInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          addrs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.id = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Peer'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}id`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}addrs[]`,
                index: obj.addrs,
                value: r.bytes()
              }

              obj.addrs++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Peer'
          }
        }
      })
    }

    return _codec
  }

  export interface PeerIdFieldEvent {
    field: '.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PeerInput): Uint8Array<ArrayBuffer> {
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
  addrs: Uint8Array<ArrayBuffer>[]
  voucher?: Envelope
}

export interface ReservationInput {
  expire?: bigint
  addrs?: Uint8Array[]
  voucher?: EnvelopeInput
}

export namespace Reservation {
  let _codec: Codec<Reservation, ReservationInput>

  export const codec = (): Codec<Reservation, ReservationInput> => {
    if (_codec == null) {
      _codec = message<Reservation, ReservationInput>((obj, w, opts = {}) => {
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
          Envelope.codec().encode(obj.voucher, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          expire: 0n,
          addrs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.expire = r.uint64()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            case 3: {
              obj.voucher = Envelope.codec().decode(r, r.uint32(), {
                limits: opts.limits?.voucher
              })
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Reservation'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}expire`,
                value: r.uint64()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}addrs[]`,
                index: obj.addrs,
                value: r.bytes()
              }

              obj.addrs++

              break
            }
            case 3: {
              yield * Envelope.codec().stream(r, r.uint32(), `${prefix}voucher.`, {
                limits: opts.limits?.voucher
              })

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Reservation'
          }
        }
      })
    }

    return _codec
  }

  export interface ReservationExpireFieldEvent {
    field: '.expire'
    value: bigint
  }

  export interface ReservationAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherMessageStart {
    field: '.voucher'
    type: 'start'
  }

  export interface ReservationVoucherMessageEnd {
    field: '.voucher'
    type: 'end'
  }

  export interface ReservationVoucherPublicKeyFieldEvent {
    field: '.voucher.publicKey'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherPayloadTypeFieldEvent {
    field: '.voucher.payloadType'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherPayloadMessageStart {
    field: '.voucher.payload'
    type: 'start'
  }

  export interface ReservationVoucherPayloadMessageEnd {
    field: '.voucher.payload'
    type: 'end'
  }

  export interface ReservationVoucherPayloadRelayFieldEvent {
    field: '.voucher.payload.relay'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherPayloadPeerFieldEvent {
    field: '.voucher.payload.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherPayloadExpirationFieldEvent {
    field: '.voucher.payload.expiration'
    value: bigint
  }

  export interface ReservationVoucherSignatureFieldEvent {
    field: '.voucher.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: ReservationInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Reservation.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Reservation>): Reservation {
    return decodeMessage(buf, Reservation.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Reservation>): Generator<ReservationExpireFieldEvent | ReservationAddrsFieldEvent | ReservationVoucherMessageStart | ReservationVoucherMessageEnd | ReservationVoucherPublicKeyFieldEvent | ReservationVoucherPayloadTypeFieldEvent | ReservationVoucherPayloadMessageStart | ReservationVoucherPayloadMessageEnd | ReservationVoucherPayloadRelayFieldEvent | ReservationVoucherPayloadPeerFieldEvent | ReservationVoucherPayloadExpirationFieldEvent | ReservationVoucherSignatureFieldEvent> {
    return streamMessage(buf, Reservation.codec(), opts)
  }
}

export interface Limit {
  duration?: number
  data?: bigint
}

export interface LimitInput {
  duration?: number
  data?: bigint
}

export namespace Limit {
  let _codec: Codec<Limit, LimitInput>

  export const codec = (): Codec<Limit, LimitInput> => {
    if (_codec == null) {
      _codec = message<Limit, LimitInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.duration = r.uint32()
              break
            }
            case 2: {
              obj.data = r.uint64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Limit'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}duration`,
                value: r.uint32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}data`,
                value: r.uint64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Limit'
          }
        }
      })
    }

    return _codec
  }

  export interface LimitDurationFieldEvent {
    field: '.duration'
    value: number
  }

  export interface LimitDataFieldEvent {
    field: '.data'
    value: bigint
  }

  export function encode (obj: LimitInput): Uint8Array<ArrayBuffer> {
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
  export const codec = (): Codec<Status, Status> => {
    return enumeration<Status>(__StatusValues)
  }
}

export interface ReservationVoucher {
  relay: Uint8Array<ArrayBuffer>
  peer: Uint8Array<ArrayBuffer>
  expiration: bigint
}

export interface ReservationVoucherInput {
  relay?: Uint8Array
  peer?: Uint8Array
  expiration?: bigint
}

export namespace ReservationVoucher {
  let _codec: Codec<ReservationVoucher, ReservationVoucherInput>

  export const codec = (): Codec<ReservationVoucher, ReservationVoucherInput> => {
    if (_codec == null) {
      _codec = message<ReservationVoucher, ReservationVoucherInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {
          relay: uint8ArrayAlloc(0),
          peer: uint8ArrayAlloc(0),
          expiration: 0n
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.relay = r.bytes()
              break
            }
            case 2: {
              obj.peer = r.bytes()
              break
            }
            case 3: {
              obj.expiration = r.uint64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'ReservationVoucher'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}relay`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}expiration`,
                value: r.uint64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'ReservationVoucher'
          }
        }
      })
    }

    return _codec
  }

  export interface ReservationVoucherRelayFieldEvent {
    field: '.relay'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ReservationVoucherExpirationFieldEvent {
    field: '.expiration'
    value: bigint
  }

  export function encode (obj: ReservationVoucherInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, ReservationVoucher.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ReservationVoucher>): ReservationVoucher {
    return decodeMessage(buf, ReservationVoucher.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ReservationVoucher>): Generator<ReservationVoucherRelayFieldEvent | ReservationVoucherPeerFieldEvent | ReservationVoucherExpirationFieldEvent> {
    return streamMessage(buf, ReservationVoucher.codec(), opts)
  }
}

export interface Envelope {
  publicKey: Uint8Array<ArrayBuffer>
  payloadType: Uint8Array<ArrayBuffer>
  payload?: ReservationVoucher
  signature: Uint8Array<ArrayBuffer>
}

export interface EnvelopeInput {
  publicKey?: Uint8Array
  payloadType?: Uint8Array
  payload?: ReservationVoucherInput
  signature?: Uint8Array
}

export namespace Envelope {
  let _codec: Codec<Envelope, EnvelopeInput>

  export const codec = (): Codec<Envelope, EnvelopeInput> => {
    if (_codec == null) {
      _codec = message<Envelope, EnvelopeInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          publicKey: uint8ArrayAlloc(0),
          payloadType: uint8ArrayAlloc(0),
          signature: uint8ArrayAlloc(0)
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.publicKey = r.bytes()
              break
            }
            case 2: {
              obj.payloadType = r.bytes()
              break
            }
            case 3: {
              obj.payload = ReservationVoucher.codec().decode(r, r.uint32(), {
                limits: opts.limits?.payload
              })
              break
            }
            case 5: {
              obj.signature = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Envelope'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}publicKey`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}payloadType`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield * ReservationVoucher.codec().stream(r, r.uint32(), `${prefix}payload.`, {
                limits: opts.limits?.payload
              })

              break
            }
            case 5: {
              yield {
                field: `${prefix}signature`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Envelope'
          }
        }
      })
    }

    return _codec
  }

  export interface EnvelopePublicKeyFieldEvent {
    field: '.publicKey'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadTypeFieldEvent {
    field: '.payloadType'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadMessageStart {
    field: '.payload'
    type: 'start'
  }

  export interface EnvelopePayloadMessageEnd {
    field: '.payload'
    type: 'end'
  }

  export interface EnvelopePayloadRelayFieldEvent {
    field: '.payload.relay'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadPeerFieldEvent {
    field: '.payload.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadExpirationFieldEvent {
    field: '.payload.expiration'
    value: bigint
  }

  export interface EnvelopeSignatureFieldEvent {
    field: '.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: EnvelopeInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Envelope.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Envelope {
    return decodeMessage(buf, Envelope.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Generator<EnvelopePublicKeyFieldEvent | EnvelopePayloadTypeFieldEvent | EnvelopePayloadMessageStart | EnvelopePayloadMessageEnd | EnvelopePayloadRelayFieldEvent | EnvelopePayloadPeerFieldEvent | EnvelopePayloadExpirationFieldEvent | EnvelopeSignatureFieldEvent> {
    return streamMessage(buf, Envelope.codec(), opts)
  }
}
