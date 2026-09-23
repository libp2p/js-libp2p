import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Record {
  key?: Uint8Array<ArrayBuffer>
  value?: Uint8Array<ArrayBuffer>
  author?: Uint8Array<ArrayBuffer>
  signature?: Uint8Array<ArrayBuffer>
  timeReceived?: string
}

export interface RecordInput {
  key?: Uint8Array
  value?: Uint8Array
  author?: Uint8Array
  signature?: Uint8Array
  timeReceived?: string
}

export namespace Record {
  let _codec: Codec<Record, RecordInput>

  export const codec = (): Codec<Record, RecordInput> => {
    if (_codec == null) {
      _codec = message<Record, RecordInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.key != null) {
          w.uint32(10)
          w.bytes(obj.key)
        }

        if (obj.value != null) {
          w.uint32(18)
          w.bytes(obj.value)
        }

        if (obj.author != null) {
          w.uint32(26)
          w.bytes(obj.author)
        }

        if (obj.signature != null) {
          w.uint32(34)
          w.bytes(obj.signature)
        }

        if (obj.timeReceived != null) {
          w.uint32(42)
          w.string(obj.timeReceived)
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
              obj.key = r.bytes()
              break
            }
            case 2: {
              obj.value = r.bytes()
              break
            }
            case 3: {
              obj.author = r.bytes()
              break
            }
            case 4: {
              obj.signature = r.bytes()
              break
            }
            case 5: {
              obj.timeReceived = r.string()
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
            message: 'Record'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}key`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}value`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}author`,
                value: r.bytes()
              }
              break
            }
            case 4: {
              yield {
                field: `${prefix}signature`,
                value: r.bytes()
              }
              break
            }
            case 5: {
              yield {
                field: `${prefix}timeReceived`,
                value: r.string()
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
            message: 'Record'
          }
        }
      })
    }

    return _codec
  }

  export interface RecordKeyFieldEvent {
    field: '.key'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RecordValueFieldEvent {
    field: '.value'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RecordAuthorFieldEvent {
    field: '.author'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RecordSignatureFieldEvent {
    field: '.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RecordTimeReceivedFieldEvent {
    field: '.timeReceived'
    value: string
  }

  export function encode (obj: RecordInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Record.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Record {
    return decodeMessage(buf, Record.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Generator<RecordKeyFieldEvent | RecordValueFieldEvent | RecordAuthorFieldEvent | RecordSignatureFieldEvent | RecordTimeReceivedFieldEvent> {
    return streamMessage(buf, Record.codec(), opts)
  }
}

export enum MessageType {
  PUT_VALUE = 'PUT_VALUE',
  GET_VALUE = 'GET_VALUE',
  ADD_PROVIDER = 'ADD_PROVIDER',
  GET_PROVIDERS = 'GET_PROVIDERS',
  FIND_NODE = 'FIND_NODE',
  PING = 'PING'
}

enum __MessageTypeValues {
  PUT_VALUE = 0,
  GET_VALUE = 1,
  ADD_PROVIDER = 2,
  GET_PROVIDERS = 3,
  FIND_NODE = 4,
  PING = 5
}

export namespace MessageType {
  export const codec = (): Codec<MessageType, MessageType> => {
    return enumeration<MessageType>(__MessageTypeValues)
  }
}

export enum ConnectionType {
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTED = 'CONNECTED',
  CAN_CONNECT = 'CAN_CONNECT',
  CANNOT_CONNECT = 'CANNOT_CONNECT'
}

enum __ConnectionTypeValues {
  NOT_CONNECTED = 0,
  CONNECTED = 1,
  CAN_CONNECT = 2,
  CANNOT_CONNECT = 3
}

export namespace ConnectionType {
  export const codec = (): Codec<ConnectionType, ConnectionType> => {
    return enumeration<ConnectionType>(__ConnectionTypeValues)
  }
}

export interface PeerInfo {
  id: Uint8Array<ArrayBuffer>
  multiaddrs: Uint8Array<ArrayBuffer>[]
  connection?: ConnectionType
}

export interface PeerInfoInput {
  id?: Uint8Array
  multiaddrs?: Uint8Array[]
  connection?: ConnectionType
}

export namespace PeerInfo {
  let _codec: Codec<PeerInfo, PeerInfoInput>

  export const codec = (): Codec<PeerInfo, PeerInfoInput> => {
    if (_codec == null) {
      _codec = message<PeerInfo, PeerInfoInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.multiaddrs != null && obj.multiaddrs.length > 0) {
          for (const value of obj.multiaddrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.connection != null) {
          w.uint32(24)
          ConnectionType.codec().encode(obj.connection, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          multiaddrs: []
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
              if (opts.limits?.multiaddrs != null && obj.multiaddrs.length === opts.limits.multiaddrs) {
                throw new MaxLengthError('Decode error - repeated field "multiaddrs" had too many elements')
              }

              obj.multiaddrs.push(r.bytes())
              break
            }
            case 3: {
              obj.connection = ConnectionType.codec().decode(r)
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
          multiaddrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PeerInfo'
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
              if (opts.limits?.multiaddrs != null && obj.multiaddrs === opts.limits.multiaddrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "multiaddrs" had too many elements')
              }

              yield {
                field: `${prefix}multiaddrs[]`,
                index: obj.multiaddrs,
                value: r.bytes()
              }

              obj.multiaddrs++

              break
            }
            case 3: {
              yield {
                field: `${prefix}connection`,
                value: ConnectionType.codec().decode(r)
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
            message: 'PeerInfo'
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

  export interface PeerInfoMultiaddrsFieldEvent {
    field: '.multiaddrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerInfoConnectionFieldEvent {
    field: '.connection'
    value: ConnectionType
  }

  export function encode (obj: PeerInfoInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PeerInfo.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo {
    return decodeMessage(buf, PeerInfo.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): Generator<PeerInfoIdFieldEvent | PeerInfoMultiaddrsFieldEvent | PeerInfoConnectionFieldEvent> {
    return streamMessage(buf, PeerInfo.codec(), opts)
  }
}

export interface Message {
  type: MessageType
  clusterLevel?: number
  key?: Uint8Array<ArrayBuffer>
  record?: Uint8Array<ArrayBuffer>
  closer: PeerInfo[]
  providers: PeerInfo[]
}

export interface MessageInput {
  type?: MessageType
  clusterLevel?: number
  key?: Uint8Array
  record?: Uint8Array
  closer?: PeerInfoInput[]
  providers?: PeerInfoInput[]
}

export namespace Message {
  let _codec: Codec<Message, MessageInput>

  export const codec = (): Codec<Message, MessageInput> => {
    if (_codec == null) {
      _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null && __MessageTypeValues[obj.type] !== 0) {
          w.uint32(8)
          MessageType.codec().encode(obj.type, w)
        }

        if (obj.clusterLevel != null) {
          w.uint32(80)
          w.int32(obj.clusterLevel)
        }

        if (obj.key != null) {
          w.uint32(18)
          w.bytes(obj.key)
        }

        if (obj.record != null) {
          w.uint32(26)
          w.bytes(obj.record)
        }

        if (obj.closer != null && obj.closer.length > 0) {
          for (const value of obj.closer) {
            w.uint32(66)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (obj.providers != null && obj.providers.length > 0) {
          for (const value of obj.providers) {
            w.uint32(74)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          type: MessageType.PUT_VALUE,
          closer: [],
          providers: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = MessageType.codec().decode(r)
              break
            }
            case 10: {
              obj.clusterLevel = r.int32()
              break
            }
            case 2: {
              obj.key = r.bytes()
              break
            }
            case 3: {
              obj.record = r.bytes()
              break
            }
            case 8: {
              if (opts.limits?.closer != null && obj.closer.length === opts.limits.closer) {
                throw new MaxLengthError('Decode error - repeated field "closer" had too many elements')
              }

              obj.closer.push(PeerInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.closer$
              }))
              break
            }
            case 9: {
              if (opts.limits?.providers != null && obj.providers.length === opts.limits.providers) {
                throw new MaxLengthError('Decode error - repeated field "providers" had too many elements')
              }

              obj.providers.push(PeerInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.providers$
              }))
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
          closer: 0,
          providers: 0
        }

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
                value: MessageType.codec().decode(r)
              }
              break
            }
            case 10: {
              yield {
                field: `${prefix}clusterLevel`,
                value: r.int32()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}key`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}record`,
                value: r.bytes()
              }
              break
            }
            case 8: {
              if (opts.limits?.closer != null && obj.closer === opts.limits.closer) {
                throw new MaxLengthError('Streaming decode error - repeated field "closer" had too many elements')
              }

              for (const evt of PeerInfo.codec().stream(r, r.uint32(), `${prefix}closer[].`, {
                limits: opts.limits?.closer$
              })) {
                yield {
                  ...evt,
                  index: obj.closer
                }
              }

              obj.closer++

              break
            }
            case 9: {
              if (opts.limits?.providers != null && obj.providers === opts.limits.providers) {
                throw new MaxLengthError('Streaming decode error - repeated field "providers" had too many elements')
              }

              for (const evt of PeerInfo.codec().stream(r, r.uint32(), `${prefix}providers[].`, {
                limits: opts.limits?.providers$
              })) {
                yield {
                  ...evt,
                  index: obj.providers
                }
              }

              obj.providers++

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
    value: MessageType
  }

  export interface MessageClusterLevelFieldEvent {
    field: '.clusterLevel'
    value: number
  }

  export interface MessageKeyFieldEvent {
    field: '.key'
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageRecordFieldEvent {
    field: '.record'
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageCloserIdFieldEvent {
    field: '.closer[].id'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface MessageCloserMultiaddrsFieldEvent {
    field: '.closer[].multiaddrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageCloserConnectionFieldEvent {
    field: '.closer[].connection'
    value: ConnectionType
    index: number
  }

  export interface MessageCloserMessageStartEvent {
    field: '.closer[]'
    index: number
    type: 'start'
    message: string
  }

  export interface MessageCloserMessageEndEvent {
    field: '.closer[]'
    index: number
    type: 'end'
    message: string
  }

  export interface MessageProvidersIdFieldEvent {
    field: '.providers[].id'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface MessageProvidersMultiaddrsFieldEvent {
    field: '.providers[].multiaddrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface MessageProvidersConnectionFieldEvent {
    field: '.providers[].connection'
    value: ConnectionType
    index: number
  }

  export interface MessageProvidersMessageStartEvent {
    field: '.providers[]'
    index: number
    type: 'start'
    message: string
  }

  export interface MessageProvidersMessageEndEvent {
    field: '.providers[]'
    index: number
    type: 'end'
    message: string
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageTypeFieldEvent | MessageClusterLevelFieldEvent | MessageKeyFieldEvent | MessageRecordFieldEvent | MessageCloserIdFieldEvent | MessageCloserMultiaddrsFieldEvent | MessageCloserConnectionFieldEvent | MessageCloserMessageStartEvent | MessageCloserMessageEndEvent | MessageProvidersIdFieldEvent | MessageProvidersMultiaddrsFieldEvent | MessageProvidersConnectionFieldEvent | MessageProvidersMessageStartEvent | MessageProvidersMessageEndEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}
