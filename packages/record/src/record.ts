import { decodeMessage, encodeMessage, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Record {
  key: Uint8Array<ArrayBuffer>
  value: Uint8Array<ArrayBuffer>
  timeReceived: string
}

export interface RecordInput {
  key?: Uint8Array
  value?: Uint8Array
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

        if ((obj.key != null && obj.key.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.key)
        }

        if ((obj.value != null && obj.value.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.value)
        }

        if ((obj.timeReceived != null && obj.timeReceived !== '')) {
          w.uint32(42)
          w.string(obj.timeReceived)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length) => {
        const obj: any = {
          key: uint8ArrayAlloc(0),
          value: uint8ArrayAlloc(0),
          timeReceived: ''
        }

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

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Generator<RecordKeyFieldEvent | RecordValueFieldEvent | RecordTimeReceivedFieldEvent> {
    return streamMessage(buf, Record.codec(), opts)
  }
}
