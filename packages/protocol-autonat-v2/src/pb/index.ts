import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  dialRequest?: DialRequest
  dialResponse?: DialResponse
  dialDataRequest?: DialDataRequest
  dialDataResponse?: DialDataResponse
}

export interface MessageInput {
  dialRequest?: DialRequestInput
  dialResponse?: DialResponseInput
  dialDataRequest?: DialDataRequestInput
  dialDataResponse?: DialDataResponseInput
}

export namespace Message {
  let _codec: Codec<Message, MessageInput>

  export const codec = (): Codec<Message, MessageInput> => {
    if (_codec == null) {
      _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        obj = { ...obj }

        if (obj.dialDataResponse != null) {
          obj.dialDataRequest = undefined
          obj.dialResponse = undefined
          obj.dialRequest = undefined
        }

        if (obj.dialDataRequest != null) {
          obj.dialDataResponse = undefined
          obj.dialResponse = undefined
          obj.dialRequest = undefined
        }

        if (obj.dialResponse != null) {
          obj.dialDataResponse = undefined
          obj.dialDataRequest = undefined
          obj.dialRequest = undefined
        }

        if (obj.dialRequest != null) {
          obj.dialDataResponse = undefined
          obj.dialDataRequest = undefined
          obj.dialResponse = undefined
        }

        if (obj.dialRequest != null) {
          w.uint32(10)
          DialRequest.codec().encode(obj.dialRequest, w)
        }

        if (obj.dialResponse != null) {
          w.uint32(18)
          DialResponse.codec().encode(obj.dialResponse, w)
        }

        if (obj.dialDataRequest != null) {
          w.uint32(26)
          DialDataRequest.codec().encode(obj.dialDataRequest, w)
        }

        if (obj.dialDataResponse != null) {
          w.uint32(34)
          DialDataResponse.codec().encode(obj.dialDataResponse, w)
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
              obj.dialRequest = DialRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dialRequest
              })
              break
            }
            case 2: {
              obj.dialResponse = DialResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dialResponse
              })
              break
            }
            case 3: {
              obj.dialDataRequest = DialDataRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dialDataRequest
              })
              break
            }
            case 4: {
              obj.dialDataResponse = DialDataResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dialDataResponse
              })
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (obj.dialDataResponse != null) {
          delete obj.dialDataRequest
          delete obj.dialResponse
          delete obj.dialRequest
        }

        if (obj.dialDataRequest != null) {
          delete obj.dialDataResponse
          delete obj.dialResponse
          delete obj.dialRequest
        }

        if (obj.dialResponse != null) {
          delete obj.dialDataResponse
          delete obj.dialDataRequest
          delete obj.dialRequest
        }

        if (obj.dialRequest != null) {
          delete obj.dialDataResponse
          delete obj.dialDataRequest
          delete obj.dialResponse
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Message'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield * DialRequest.codec().stream(r, r.uint32(), `${prefix}dialRequest.`, {
                limits: opts.limits?.dialRequest
              })

              break
            }
            case 2: {
              yield * DialResponse.codec().stream(r, r.uint32(), `${prefix}dialResponse.`, {
                limits: opts.limits?.dialResponse
              })

              break
            }
            case 3: {
              yield * DialDataRequest.codec().stream(r, r.uint32(), `${prefix}dialDataRequest.`, {
                limits: opts.limits?.dialDataRequest
              })

              break
            }
            case 4: {
              yield * DialDataResponse.codec().stream(r, r.uint32(), `${prefix}dialDataResponse.`, {
                limits: opts.limits?.dialDataResponse
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
            message: 'Message'
          }
        }
      })
    }

    return _codec
  }

  export interface MessageDialRequestMessageStart {
    field: '.dialRequest'
    type: 'start'
  }

  export interface MessageDialRequestMessageEnd {
    field: '.dialRequest'
    type: 'end'
  }

  export interface MessageDialRequestAddrsFieldEvent {
    field: '.dialRequest.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageDialRequestNonceFieldEvent {
    field: '.dialRequest.nonce'
    value: bigint
  }

  export interface MessageDialResponseMessageStart {
    field: '.dialResponse'
    type: 'start'
  }

  export interface MessageDialResponseMessageEnd {
    field: '.dialResponse'
    type: 'end'
  }

  export interface MessageDialResponseStatusFieldEvent {
    field: '.dialResponse.status'
    value: DialResponse.ResponseStatus
  }

  export interface MessageDialResponseAddrIdxFieldEvent {
    field: '.dialResponse.addrIdx'
    value: number
  }

  export interface MessageDialResponseDialStatusFieldEvent {
    field: '.dialResponse.dialStatus'
    value: DialStatus
  }

  export interface MessageDialDataRequestMessageStart {
    field: '.dialDataRequest'
    type: 'start'
  }

  export interface MessageDialDataRequestMessageEnd {
    field: '.dialDataRequest'
    type: 'end'
  }

  export interface MessageDialDataRequestAddrIdxFieldEvent {
    field: '.dialDataRequest.addrIdx'
    value: number
  }

  export interface MessageDialDataRequestNumBytesFieldEvent {
    field: '.dialDataRequest.numBytes'
    value: bigint
  }

  export interface MessageDialDataResponseMessageStart {
    field: '.dialDataResponse'
    type: 'start'
  }

  export interface MessageDialDataResponseMessageEnd {
    field: '.dialDataResponse'
    type: 'end'
  }

  export interface MessageDialDataResponseDataFieldEvent {
    field: '.dialDataResponse.data'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageDialRequestMessageStart | MessageDialRequestMessageEnd | MessageDialRequestAddrsFieldEvent | MessageDialRequestNonceFieldEvent | MessageDialResponseMessageStart | MessageDialResponseMessageEnd | MessageDialResponseStatusFieldEvent | MessageDialResponseAddrIdxFieldEvent | MessageDialResponseDialStatusFieldEvent | MessageDialDataRequestMessageStart | MessageDialDataRequestMessageEnd | MessageDialDataRequestAddrIdxFieldEvent | MessageDialDataRequestNumBytesFieldEvent | MessageDialDataResponseMessageStart | MessageDialDataResponseMessageEnd | MessageDialDataResponseDataFieldEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}

export interface DialRequest {
  addrs: Uint8Array<ArrayBuffer>[]
  nonce: bigint
}

export interface DialRequestInput {
  addrs?: Uint8Array[]
  nonce?: bigint
}

export namespace DialRequest {
  let _codec: Codec<DialRequest, DialRequestInput>

  export const codec = (): Codec<DialRequest, DialRequestInput> => {
    if (_codec == null) {
      _codec = message<DialRequest, DialRequestInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
          for (const value of obj.addrs) {
            w.uint32(10)
            w.bytes(value)
          }
        }

        if ((obj.nonce != null && obj.nonce !== 0n)) {
          w.uint32(17)
          w.fixed64(obj.nonce)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          addrs: [],
          nonce: 0n
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            case 2: {
              obj.nonce = r.fixed64()
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
            message: 'DialRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
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
            case 2: {
              yield {
                field: `${prefix}nonce`,
                value: r.fixed64()
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
            message: 'DialRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface DialRequestAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface DialRequestNonceFieldEvent {
    field: '.nonce'
    value: bigint
  }

  export function encode (obj: DialRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialRequest>): DialRequest {
    return decodeMessage(buf, DialRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialRequest>): Generator<DialRequestAddrsFieldEvent | DialRequestNonceFieldEvent> {
    return streamMessage(buf, DialRequest.codec(), opts)
  }
}

export interface DialDataRequest {
  addrIdx: number
  numBytes: bigint
}

export interface DialDataRequestInput {
  addrIdx?: number
  numBytes?: bigint
}

export namespace DialDataRequest {
  let _codec: Codec<DialDataRequest, DialDataRequestInput>

  export const codec = (): Codec<DialDataRequest, DialDataRequestInput> => {
    if (_codec == null) {
      _codec = message<DialDataRequest, DialDataRequestInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.addrIdx != null && obj.addrIdx !== 0)) {
          w.uint32(8)
          w.uint32(obj.addrIdx)
        }

        if ((obj.numBytes != null && obj.numBytes !== 0n)) {
          w.uint32(16)
          w.uint64(obj.numBytes)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          addrIdx: 0,
          numBytes: 0n
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.addrIdx = r.uint32()
              break
            }
            case 2: {
              obj.numBytes = r.uint64()
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
            message: 'DialDataRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}addrIdx`,
                value: r.uint32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}numBytes`,
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
            message: 'DialDataRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface DialDataRequestAddrIdxFieldEvent {
    field: '.addrIdx'
    value: number
  }

  export interface DialDataRequestNumBytesFieldEvent {
    field: '.numBytes'
    value: bigint
  }

  export function encode (obj: DialDataRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialDataRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialDataRequest>): DialDataRequest {
    return decodeMessage(buf, DialDataRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialDataRequest>): Generator<DialDataRequestAddrIdxFieldEvent | DialDataRequestNumBytesFieldEvent> {
    return streamMessage(buf, DialDataRequest.codec(), opts)
  }
}

export enum DialStatus {
  UNUSED = 'UNUSED',
  E_DIAL_ERROR = 'E_DIAL_ERROR',
  E_DIAL_BACK_ERROR = 'E_DIAL_BACK_ERROR',
  OK = 'OK'
}

enum __DialStatusValues {
  UNUSED = 0,
  E_DIAL_ERROR = 100,
  E_DIAL_BACK_ERROR = 101,
  OK = 200
}

export namespace DialStatus {
  export const codec = (): Codec<DialStatus, DialStatus> => {
    return enumeration<DialStatus>(__DialStatusValues)
  }
}

export interface DialResponse {
  status: DialResponse.ResponseStatus
  addrIdx: number
  dialStatus: DialStatus
}

export interface DialResponseInput {
  status?: DialResponse.ResponseStatus
  addrIdx?: number
  dialStatus?: DialStatus
}

export namespace DialResponse {
  export enum ResponseStatus {
    E_INTERNAL_ERROR = 'E_INTERNAL_ERROR',
    E_REQUEST_REJECTED = 'E_REQUEST_REJECTED',
    E_DIAL_REFUSED = 'E_DIAL_REFUSED',
    OK = 'OK'
  }

  enum __ResponseStatusValues {
    E_INTERNAL_ERROR = 0,
    E_REQUEST_REJECTED = 100,
    E_DIAL_REFUSED = 101,
    OK = 200
  }

  export namespace ResponseStatus {
    export const codec = (): Codec<ResponseStatus, ResponseStatus> => {
      return enumeration<ResponseStatus>(__ResponseStatusValues)
    }
  }

  let _codec: Codec<DialResponse, DialResponseInput>

  export const codec = (): Codec<DialResponse, DialResponseInput> => {
    if (_codec == null) {
      _codec = message<DialResponse, DialResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.status != null && __ResponseStatusValues[obj.status] !== 0) {
          w.uint32(8)
          DialResponse.ResponseStatus.codec().encode(obj.status, w)
        }

        if ((obj.addrIdx != null && obj.addrIdx !== 0)) {
          w.uint32(16)
          w.uint32(obj.addrIdx)
        }

        if (obj.dialStatus != null && __DialStatusValues[obj.dialStatus] !== 0) {
          w.uint32(24)
          DialStatus.codec().encode(obj.dialStatus, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          status: ResponseStatus.E_INTERNAL_ERROR,
          addrIdx: 0,
          dialStatus: DialStatus.UNUSED
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.status = DialResponse.ResponseStatus.codec().decode(r)
              break
            }
            case 2: {
              obj.addrIdx = r.uint32()
              break
            }
            case 3: {
              obj.dialStatus = DialStatus.codec().decode(r)
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
            message: 'DialResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}status`,
                value: DialResponse.ResponseStatus.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}addrIdx`,
                value: r.uint32()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}dialStatus`,
                value: DialStatus.codec().decode(r)
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
            message: 'DialResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface DialResponseStatusFieldEvent {
    field: '.status'
    value: DialResponse.ResponseStatus
  }

  export interface DialResponseAddrIdxFieldEvent {
    field: '.addrIdx'
    value: number
  }

  export interface DialResponseDialStatusFieldEvent {
    field: '.dialStatus'
    value: DialStatus
  }

  export function encode (obj: DialResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialResponse>): DialResponse {
    return decodeMessage(buf, DialResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialResponse>): Generator<DialResponseStatusFieldEvent | DialResponseAddrIdxFieldEvent | DialResponseDialStatusFieldEvent> {
    return streamMessage(buf, DialResponse.codec(), opts)
  }
}

export interface DialDataResponse {
  data: Uint8Array<ArrayBuffer>
}

export interface DialDataResponseInput {
  data?: Uint8Array
}

export namespace DialDataResponse {
  let _codec: Codec<DialDataResponse, DialDataResponseInput>

  export const codec = (): Codec<DialDataResponse, DialDataResponseInput> => {
    if (_codec == null) {
      _codec = message<DialDataResponse, DialDataResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.data != null && obj.data.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          data: uint8ArrayAlloc(0)
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.data = r.bytes()
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
            message: 'DialDataResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}data`,
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
            message: 'DialDataResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface DialDataResponseDataFieldEvent {
    field: '.data'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: DialDataResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialDataResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialDataResponse>): DialDataResponse {
    return decodeMessage(buf, DialDataResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialDataResponse>): Generator<DialDataResponseDataFieldEvent> {
    return streamMessage(buf, DialDataResponse.codec(), opts)
  }
}

export interface DialBack {
  nonce: bigint
}

export interface DialBackInput {
  nonce?: bigint
}

export namespace DialBack {
  let _codec: Codec<DialBack, DialBackInput>

  export const codec = (): Codec<DialBack, DialBackInput> => {
    if (_codec == null) {
      _codec = message<DialBack, DialBackInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.nonce != null && obj.nonce !== 0n)) {
          w.uint32(9)
          w.fixed64(obj.nonce)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          nonce: 0n
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.nonce = r.fixed64()
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
            message: 'DialBack'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}nonce`,
                value: r.fixed64()
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
            message: 'DialBack'
          }
        }
      })
    }

    return _codec
  }

  export interface DialBackNonceFieldEvent {
    field: '.nonce'
    value: bigint
  }

  export function encode (obj: DialBackInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialBack.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialBack>): DialBack {
    return decodeMessage(buf, DialBack.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialBack>): Generator<DialBackNonceFieldEvent> {
    return streamMessage(buf, DialBack.codec(), opts)
  }
}

export interface DialBackResponse {
  status: DialBackResponse.DialBackStatus
}

export interface DialBackResponseInput {
  status?: DialBackResponse.DialBackStatus
}

export namespace DialBackResponse {
  export enum DialBackStatus {
    OK = 'OK'
  }

  enum __DialBackStatusValues {
    OK = 0
  }

  export namespace DialBackStatus {
    export const codec = (): Codec<DialBackStatus, DialBackStatus> => {
      return enumeration<DialBackStatus>(__DialBackStatusValues)
    }
  }

  let _codec: Codec<DialBackResponse, DialBackResponseInput>

  export const codec = (): Codec<DialBackResponse, DialBackResponseInput> => {
    if (_codec == null) {
      _codec = message<DialBackResponse, DialBackResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.status != null && __DialBackStatusValues[obj.status] !== 0) {
          w.uint32(8)
          DialBackResponse.DialBackStatus.codec().encode(obj.status, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          status: DialBackStatus.OK
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.status = DialBackResponse.DialBackStatus.codec().decode(r)
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
            message: 'DialBackResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}status`,
                value: DialBackResponse.DialBackStatus.codec().decode(r)
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
            message: 'DialBackResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface DialBackResponseStatusFieldEvent {
    field: '.status'
    value: DialBackResponse.DialBackStatus
  }

  export function encode (obj: DialBackResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DialBackResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialBackResponse>): DialBackResponse {
    return decodeMessage(buf, DialBackResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialBackResponse>): Generator<DialBackResponseStatusFieldEvent> {
    return streamMessage(buf, DialBackResponse.codec(), opts)
  }
}
