import { decodeMessage, encodeMessage, enumeration, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  type?: Message.Type
  data?: string
}

export interface MessageInput {
  type?: Message.Type
  data?: string
}

export namespace Message {
  export enum Type {
    SDP_OFFER = 'SDP_OFFER',
    SDP_ANSWER = 'SDP_ANSWER',
    ICE_CANDIDATE = 'ICE_CANDIDATE'
  }

  enum __TypeValues {
    SDP_OFFER = 0,
    SDP_ANSWER = 1,
    ICE_CANDIDATE = 2
  }

  export namespace Type {
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
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
          Message.Type.codec().encode(obj.type, w)
        }

        if (obj.data != null) {
          w.uint32(18)
          w.string(obj.data)
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
              obj.type = Message.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.data = r.string()
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
            message: 'Message'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: Message.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}data`,
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
            message: 'Message'
          }
        }
      })
    }

    return _codec
  }

  export interface MessageTypeFieldEvent {
    field: '.type'
    value: Message.Type
  }

  export interface MessageDataFieldEvent {
    field: '.data'
    value: string
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageTypeFieldEvent | MessageDataFieldEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}
