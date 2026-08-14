import { decodeMessage, encodeMessage, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Record {
  key: Uint8Array
  value: Uint8Array
  timeReceived: string
}

export namespace Record {
  let _codec: Codec<Record>

  export const codec = (): Codec<Record> => {
    if (_codec == null) {
      _codec = message<Record>((obj, w, opts = {}) => {
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
      }, (reader, length, opts = {}) => {
        const obj: any = {
          key: uint8ArrayAlloc(0),
          value: uint8ArrayAlloc(0),
          timeReceived: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.key = reader.bytes()
              break
            }
            case 2: {
              obj.value = reader.bytes()
              break
            }
            case 5: {
              obj.timeReceived = reader.string()
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (reader, length, prefix, opts = {}) {
        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}.key`,
                value: reader.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}.value`,
                value: reader.bytes()
              }
              break
            }
            case 5: {
              yield {
                field: `${prefix}.timeReceived`,
                value: reader.string()
              }
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }
      })
    }

    return _codec
  }

  export interface RecordKeyFieldEvent {
    field: '$.key'
    value: Uint8Array
  }

  export interface RecordValueFieldEvent {
    field: '$.value'
    value: Uint8Array
  }

  export interface RecordTimeReceivedFieldEvent {
    field: '$.timeReceived'
    value: string
  }

  export function encode (obj: Partial<Record>): Uint8Array {
    return encodeMessage(obj, Record.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Record {
    return decodeMessage(buf, Record.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Generator<RecordKeyFieldEvent | RecordValueFieldEvent | RecordTimeReceivedFieldEvent> {
    return streamMessage(buf, Record.codec(), opts)
  }
}
