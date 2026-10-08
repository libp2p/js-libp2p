import { decodeMessage, encodeMessage, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Message {
  message: string
  value: number
  flag: boolean
}

export interface MessageInput {
  message?: string
  value?: number
  flag?: boolean
}

export namespace Message {
  let _codec: Codec<Message, MessageInput>

  export const codec = (): Codec<Message, MessageInput> => {
    if (_codec == null) {
      _codec = message<Message, MessageInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.message != null && obj.message !== '')) {
          w.uint32(10)
          w.string(obj.message)
        }

        if ((obj.value != null && obj.value !== 0)) {
          w.uint32(16)
          w.uint32(obj.value)
        }

        if ((obj.flag != null && obj.flag !== false)) {
          w.uint32(24)
          w.bool(obj.flag)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          message: '',
          value: 0,
          flag: false
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.message = r.string()
              break
            }
            case 2: {
              obj.value = r.uint32()
              break
            }
            case 3: {
              obj.flag = r.bool()
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
                field: `${prefix}message`,
                value: r.string()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}value`,
                value: r.uint32()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}flag`,
                value: r.bool()
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

  export interface MessageMessageFieldEvent {
    field: '.message'
    value: string
  }

  export interface MessageValueFieldEvent {
    field: '.value'
    value: number
  }

  export interface MessageFlagFieldEvent {
    field: '.flag'
    value: boolean
  }

  export function encode (obj: MessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Message.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message {
    return decodeMessage(buf, Message.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Generator<MessageMessageFieldEvent | MessageValueFieldEvent | MessageFlagFieldEvent> {
    return streamMessage(buf, Message.codec(), opts)
  }
}
