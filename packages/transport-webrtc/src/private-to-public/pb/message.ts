import { decodeMessage, encodeMessage, enumeration, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  flag?: Message.Flag
  message?: Uint8Array<ArrayBuffer>
}

export interface MessageInput {
  flag?: Message.Flag
  message?: Uint8Array
}

export namespace Message {
  export enum Flag {
    FIN = 'FIN',
    STOP_SENDING = 'STOP_SENDING',
    RESET = 'RESET',
    FIN_ACK = 'FIN_ACK'
  }

  enum __FlagValues {
    FIN = 0,
    STOP_SENDING = 1,
    RESET = 2,
    FIN_ACK = 3
  }

  export namespace Flag {
    export const codec = (): Codec<Flag, Flag> => {
      return enumeration<Flag>(__FlagValues)
    }
  }

  let _codec: Codec<Message, MessageInput>

  export const codec = (): Codec<Message, MessageInput> => {
    if (_codec == null) {
      _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.flag != null) {
          w.uint32(8)
          Message.Flag.codec().encode(obj.flag, w)
        }

        if (obj.message != null) {
          w.uint32(18)
          w.bytes(obj.message)
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
              obj.flag = Message.Flag.codec().decode(r)
              break
            }
            case 2: {
              obj.message = r.bytes()
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
                field: `${prefix}flag`,
                value: Message.Flag.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}message`,
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
            message: 'Message'
          }
        }
      })
    }

    return _codec
  }

  export interface MessageFlagFieldEvent {
    field: '.flag'
    value: Message.Flag
  }

  export interface MessageMessageFieldEvent {
    field: '.message'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageFlagFieldEvent | MessageMessageFieldEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}
