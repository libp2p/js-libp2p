import { decodeMessage, encodeMessage, MaxLengthError, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface RPC {
  subscriptions: RPC.SubOpts[]
  messages: RPC.Message[]
}

export interface RPCInput {
  subscriptions?: RPC.SubOptsInput[]
  messages?: RPC.MessageInput[]
}

export namespace RPC {
  export interface SubOpts {
    subscribe?: boolean
    topic?: string
  }

  export interface SubOptsInput {
    subscribe?: boolean
    topic?: string
  }

  export namespace SubOpts {
    let _codec: Codec<SubOpts, SubOptsInput>

    export const codec = (): Codec<SubOpts, SubOptsInput> => {
      if (_codec == null) {
        _codec = message<SubOpts, SubOptsInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.subscribe != null) {
            w.uint32(8)
            w.bool(obj.subscribe)
          }

          if (obj.topic != null) {
            w.uint32(18)
            w.string(obj.topic)
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
                obj.subscribe = r.bool()
                break
              }
              case 2: {
                obj.topic = r.string()
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
              message: 'RPC.SubOpts'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}subscribe`,
                  value: r.bool()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}topic`,
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
              message: 'RPC.SubOpts'
            }
          }
        })
      }

      return _codec
    }

    export interface SubOptsSubscribeFieldEvent {
      field: '.subscribe'
      value: boolean
    }

    export interface SubOptsTopicFieldEvent {
      field: '.topic'
      value: string
    }

    export function encode (obj: SubOptsInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, SubOpts.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubOpts>): SubOpts {
      return decodeMessage(buf, SubOpts.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SubOpts>): Generator<SubOptsSubscribeFieldEvent | SubOptsTopicFieldEvent> {
      return streamMessage(buf, SubOpts.codec(), opts)
    }
  }

  export interface Message {
    from?: Uint8Array<ArrayBuffer>
    data?: Uint8Array<ArrayBuffer>
    sequenceNumber?: Uint8Array<ArrayBuffer>
    topic?: string
    signature?: Uint8Array<ArrayBuffer>
    key?: Uint8Array<ArrayBuffer>
  }

  export interface MessageInput {
    from?: Uint8Array
    data?: Uint8Array
    sequenceNumber?: Uint8Array
    topic?: string
    signature?: Uint8Array
    key?: Uint8Array
  }

  export namespace Message {
    let _codec: Codec<Message, MessageInput>

    export const codec = (): Codec<Message, MessageInput> => {
      if (_codec == null) {
        _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.from != null) {
            w.uint32(10)
            w.bytes(obj.from)
          }

          if (obj.data != null) {
            w.uint32(18)
            w.bytes(obj.data)
          }

          if (obj.sequenceNumber != null) {
            w.uint32(26)
            w.bytes(obj.sequenceNumber)
          }

          if (obj.topic != null) {
            w.uint32(34)
            w.string(obj.topic)
          }

          if (obj.signature != null) {
            w.uint32(42)
            w.bytes(obj.signature)
          }

          if (obj.key != null) {
            w.uint32(50)
            w.bytes(obj.key)
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
                obj.from = r.bytes()
                break
              }
              case 2: {
                obj.data = r.bytes()
                break
              }
              case 3: {
                obj.sequenceNumber = r.bytes()
                break
              }
              case 4: {
                obj.topic = r.string()
                break
              }
              case 5: {
                obj.signature = r.bytes()
                break
              }
              case 6: {
                obj.key = r.bytes()
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
              message: 'RPC.Message'
            }
          }

          while (r.pos < end) {
            const tag = r.uint32()

            switch (tag >>> 3) {
              case 1: {
                yield {
                  field: `${prefix}from`,
                  value: r.bytes()
                }
                break
              }
              case 2: {
                yield {
                  field: `${prefix}data`,
                  value: r.bytes()
                }
                break
              }
              case 3: {
                yield {
                  field: `${prefix}sequenceNumber`,
                  value: r.bytes()
                }
                break
              }
              case 4: {
                yield {
                  field: `${prefix}topic`,
                  value: r.string()
                }
                break
              }
              case 5: {
                yield {
                  field: `${prefix}signature`,
                  value: r.bytes()
                }
                break
              }
              case 6: {
                yield {
                  field: `${prefix}key`,
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
              message: 'RPC.Message'
            }
          }
        })
      }

      return _codec
    }

    export interface MessageFromFieldEvent {
      field: '.from'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageDataFieldEvent {
      field: '.data'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageSequenceNumberFieldEvent {
      field: '.sequenceNumber'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageTopicFieldEvent {
      field: '.topic'
      value: string
    }

    export interface MessageSignatureFieldEvent {
      field: '.signature'
      value: Uint8Array<ArrayBuffer>
    }

    export interface MessageKeyFieldEvent {
      field: '.key'
      value: Uint8Array<ArrayBuffer>
    }

    export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
      return encodeMessage(obj, Message.codec())
    }

    export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
      return decodeMessage(buf, Message.codec(), opts)
    }

    export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageFromFieldEvent | MessageDataFieldEvent | MessageSequenceNumberFieldEvent | MessageTopicFieldEvent | MessageSignatureFieldEvent | MessageKeyFieldEvent> {
      return streamMessage(buf, Message.codec(), opts)
    }
  }

  let _codec: Codec<RPC, RPCInput>

  export const codec = (): Codec<RPC, RPCInput> => {
    if (_codec == null) {
      _codec = message<RPC, RPCInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.subscriptions != null && obj.subscriptions.length > 0) {
          for (const value of obj.subscriptions) {
            w.uint32(10)
            RPC.SubOpts.codec().encode(value, w)
          }
        }

        if (obj.messages != null && obj.messages.length > 0) {
          for (const value of obj.messages) {
            w.uint32(18)
            RPC.Message.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          subscriptions: [],
          messages: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.subscriptions != null && obj.subscriptions.length === opts.limits.subscriptions) {
                throw new MaxLengthError('Decode error - repeated field "subscriptions" had too many elements')
              }

              obj.subscriptions.push(RPC.SubOpts.codec().decode(r, r.uint32(), {
                limits: opts.limits?.subscriptions$
              }))
              break
            }
            case 2: {
              if (opts.limits?.messages != null && obj.messages.length === opts.limits.messages) {
                throw new MaxLengthError('Decode error - repeated field "messages" had too many elements')
              }

              obj.messages.push(RPC.Message.codec().decode(r, r.uint32(), {
                limits: opts.limits?.messages$
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
          subscriptions: 0,
          messages: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'RPC'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.subscriptions != null && obj.subscriptions === opts.limits.subscriptions) {
                throw new MaxLengthError('Streaming decode error - repeated field "subscriptions" had too many elements')
              }

              for (const evt of RPC.SubOpts.codec().stream(r, r.uint32(), `${prefix}subscriptions[].`, {
                limits: opts.limits?.subscriptions$
              })) {
                yield {
                  ...evt,
                  index: obj.subscriptions
                }
              }

              obj.subscriptions++

              break
            }
            case 2: {
              if (opts.limits?.messages != null && obj.messages === opts.limits.messages) {
                throw new MaxLengthError('Streaming decode error - repeated field "messages" had too many elements')
              }

              for (const evt of RPC.Message.codec().stream(r, r.uint32(), `${prefix}messages[].`, {
                limits: opts.limits?.messages$
              })) {
                yield {
                  ...evt,
                  index: obj.messages
                }
              }

              obj.messages++

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
            message: 'RPC'
          }
        }
      })
    }

    return _codec
  }

  export interface RPCSubscriptionsSubscribeFieldEvent {
    field: '.subscriptions[].subscribe'
    value: boolean
    index: number
  }

  export interface RPCSubscriptionsTopicFieldEvent {
    field: '.subscriptions[].topic'
    value: string
    index: number
  }

  export interface RPCSubscriptionsMessageStartEvent {
    field: '.subscriptions[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCSubscriptionsMessageEndEvent {
    field: '.subscriptions[]'
    index: number
    type: 'end'
    message: string
  }

  export interface RPCMessagesFromFieldEvent {
    field: '.messages[].from'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesDataFieldEvent {
    field: '.messages[].data'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesSequenceNumberFieldEvent {
    field: '.messages[].sequenceNumber'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesTopicFieldEvent {
    field: '.messages[].topic'
    value: string
    index: number
  }

  export interface RPCMessagesSignatureFieldEvent {
    field: '.messages[].signature'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesKeyFieldEvent {
    field: '.messages[].key'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface RPCMessagesMessageStartEvent {
    field: '.messages[]'
    index: number
    type: 'start'
    message: string
  }

  export interface RPCMessagesMessageEndEvent {
    field: '.messages[]'
    index: number
    type: 'end'
    message: string
  }

  export function encode (obj: RPCInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, RPC.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RPC>): RPC {
    return decodeMessage(buf, RPC.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RPC>): Generator<RPCSubscriptionsSubscribeFieldEvent | RPCSubscriptionsTopicFieldEvent | RPCSubscriptionsMessageStartEvent | RPCSubscriptionsMessageEndEvent | RPCMessagesFromFieldEvent | RPCMessagesDataFieldEvent | RPCMessagesSequenceNumberFieldEvent | RPCMessagesTopicFieldEvent | RPCMessagesSignatureFieldEvent | RPCMessagesKeyFieldEvent | RPCMessagesMessageStartEvent | RPCMessagesMessageEndEvent> {
    return streamMessage(buf, RPC.codec(), opts)
  }
}
