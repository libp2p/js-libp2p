import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  type?: Message.MessageType
  dial?: Message.Dial
  dialResponse?: Message.DialResponse
}

export interface MessageInput {
  type?: Message.MessageType
  dial?: Message.DialInput
  dialResponse?: Message.DialResponseInput
}

export namespace Message {
  export enum MessageType {
    DIAL = 'DIAL',
    DIAL_RESPONSE = 'DIAL_RESPONSE'
  }

  enum __MessageTypeValues {
    DIAL = 0,
    DIAL_RESPONSE = 1
  }

  export namespace MessageType {
    export const codec = (): Codec<MessageType, MessageType> => {
      return enumeration<MessageType>(__MessageTypeValues)
    }
  }

  export enum ResponseStatus {
    OK = 'OK',
    E_DIAL_ERROR = 'E_DIAL_ERROR',
    E_DIAL_REFUSED = 'E_DIAL_REFUSED',
    E_BAD_REQUEST = 'E_BAD_REQUEST',
    E_INTERNAL_ERROR = 'E_INTERNAL_ERROR'
  }

  enum __ResponseStatusValues {
    OK = 0,
    E_DIAL_ERROR = 100,
    E_DIAL_REFUSED = 101,
    E_BAD_REQUEST = 200,
    E_INTERNAL_ERROR = 300
  }

  export namespace ResponseStatus {
    export const codec = (): Codec<ResponseStatus, ResponseStatus> => {
      return enumeration<ResponseStatus>(__ResponseStatusValues)
    }
  }

  export interface PeerInfo {
    id?: Uint8Array<ArrayBuffer>
    addrs: Uint8Array<ArrayBuffer>[]
  }

  export interface PeerInfoInput {
    id?: Uint8Array
    addrs?: Uint8Array[]
  }

  export namespace PeerInfo {
    let _codec: Codec<PeerInfo, PeerInfoInput>

    export const codec = (): Codec<PeerInfo, PeerInfoInput> => {
      if (_codec == null) {
        _codec = message<PeerInfo, PeerInfoInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.id != null) {
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
              message: 'Message.PeerInfo'
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
              message: 'Message.PeerInfo'
            }
          }
        })
      }

      return _codec
    }

    export interface PeerInfoIdFieldEvent {
      field: '.id'
      value: Uint8Array<ArrayBuffer>
    }

    export interface PeerInfoAddrsFieldEvent {
      field: '.addrs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: PeerInfoInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, PeerInfo.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo {
      return decodeMessage(buf, PeerInfo.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): Generator<PeerInfoIdFieldEvent | PeerInfoAddrsFieldEvent> {
      return streamMessage(buf, PeerInfo.codec(), opts)
    }
  }

  export interface Dial {
    peer?: Message.PeerInfo
  }

  export interface DialInput {
    peer?: Message.PeerInfoInput
  }

  export namespace Dial {
    let _codec: Codec<Dial, DialInput>

    export const codec = (): Codec<Dial, DialInput> => {
      if (_codec == null) {
        _codec = message<Dial, DialInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.peer != null) {
            w.uint32(10)
            Message.PeerInfo.codec().encode(obj.peer, w)
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
                obj.peer = Message.PeerInfo.codec().decode(r, r.uint32(), {
                  limits: opts.limits?.peer
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
          const end = length == null ? r.len : r.pos + length

          if (prefix !== '.') {
            yield {
              field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
              type: 'start',
              message: 'Message.Dial'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield * Message.PeerInfo.codec().stream(r, r.uint32(), `${prefix}peer.`, {
                  limits: opts.limits?.peer
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
              message: 'Message.Dial'
            }
          }
        })
      }

      return _codec
    }

    export interface DialPeerMessageStart {
      field: '.peer'
      type: 'start'
    }

    export interface DialPeerMessageEnd {
      field: '.peer'
      type: 'end'
    }

    export interface DialPeerIdFieldEvent {
      field: '.peer.id'
      value: Uint8Array<ArrayBuffer>
    }

    export interface DialPeerAddrsFieldEvent {
      field: '.peer.addrs[]'
      index: number
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: DialInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, Dial.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Dial>): Dial {
      return decodeMessage(buf, Dial.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Dial>): Generator<DialPeerMessageStart | DialPeerMessageEnd | DialPeerIdFieldEvent | DialPeerAddrsFieldEvent> {
      return streamMessage(buf, Dial.codec(), opts)
    }
  }

  export interface DialResponse {
    status?: Message.ResponseStatus
    statusText?: string
    addr?: Uint8Array<ArrayBuffer>
  }

  export interface DialResponseInput {
    status?: Message.ResponseStatus
    statusText?: string
    addr?: Uint8Array
  }

  export namespace DialResponse {
    let _codec: Codec<DialResponse, DialResponseInput>

    export const codec = (): Codec<DialResponse, DialResponseInput> => {
      if (_codec == null) {
        _codec = message<DialResponse, DialResponseInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.status != null) {
            w.uint32(8)
            Message.ResponseStatus.codec().encode(obj.status, w)
          }

          if (obj.statusText != null) {
            w.uint32(18)
            w.string(obj.statusText)
          }

          if (obj.addr != null) {
            w.uint32(26)
            w.bytes(obj.addr)
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
                obj.status = Message.ResponseStatus.codec().decode(r)
                break
              }
              case 2: {
                obj.statusText = r.string()
                break
              }
              case 3: {
                obj.addr = r.bytes()
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
              message: 'Message.DialResponse'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}status`,
                  value: Message.ResponseStatus.codec().decode(r)
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}statusText`,
                  value: r.string()
                }
                break
              }
              case 3: {
                yield {
                  field: `${prefix}addr`,
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
              message: 'Message.DialResponse'
            }
          }
        })
      }

      return _codec
    }

    export interface DialResponseStatusFieldEvent {
      field: '.status'
      value: Message.ResponseStatus
    }

    export interface DialResponseStatusTextFieldEvent {
      field: '.statusText'
      value: string
    }

    export interface DialResponseAddrFieldEvent {
      field: '.addr'
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: DialResponseInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, DialResponse.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialResponse>): DialResponse {
      return decodeMessage(buf, DialResponse.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DialResponse>): Generator<DialResponseStatusFieldEvent | DialResponseStatusTextFieldEvent | DialResponseAddrFieldEvent> {
      return streamMessage(buf, DialResponse.codec(), opts)
    }
  }

  let _codec: Codec<Message, MessageInput>

  export const codec = (): Codec<Message, MessageInput> => {
    if (_codec == null) {
      _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          Message.MessageType.codec().encode(obj.type, w)
        }

        if (obj.dial != null) {
          w.uint32(18)
          Message.Dial.codec().encode(obj.dial, w)
        }

        if (obj.dialResponse != null) {
          w.uint32(26)
          Message.DialResponse.codec().encode(obj.dialResponse, w)
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
              obj.type = Message.MessageType.codec().decode(r)
              break
            }
            case 2: {
              obj.dial = Message.Dial.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dial
              })
              break
            }
            case 3: {
              obj.dialResponse = Message.DialResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dialResponse
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
              yield {
                field: `${prefix}type`,
                value: Message.MessageType.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * Message.Dial.codec().stream(r, r.uint32(), `${prefix}dial.`, {
                limits: opts.limits?.dial
              })

              break
            }
            case 3: {
              yield * Message.DialResponse.codec().stream(r, r.uint32(), `${prefix}dialResponse.`, {
                limits: opts.limits?.dialResponse
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

  export interface MessageTypeFieldEvent {
    field: '.type'
    value: Message.MessageType
  }

  export interface MessageDialMessageStart {
    field: '.dial'
    type: 'start'
  }

  export interface MessageDialMessageEnd {
    field: '.dial'
    type: 'end'
  }

  export interface MessageDialPeerMessageStart {
    field: '.dial.peer'
    type: 'start'
  }

  export interface MessageDialPeerMessageEnd {
    field: '.dial.peer'
    type: 'end'
  }

  export interface MessageDialPeerIdFieldEvent {
    field: '.dial.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageDialPeerAddrsFieldEvent {
    field: '.dial.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
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
    value: Message.ResponseStatus
  }

  export interface MessageDialResponseStatusTextFieldEvent {
    field: '.dialResponse.statusText'
    value: string
  }

  export interface MessageDialResponseAddrFieldEvent {
    field: '.dialResponse.addr'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageTypeFieldEvent | MessageDialMessageStart | MessageDialMessageEnd | MessageDialPeerMessageStart | MessageDialPeerMessageEnd | MessageDialPeerIdFieldEvent | MessageDialPeerAddrsFieldEvent | MessageDialResponseMessageStart | MessageDialResponseMessageEnd | MessageDialResponseStatusFieldEvent | MessageDialResponseStatusTextFieldEvent | MessageDialResponseAddrFieldEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}
