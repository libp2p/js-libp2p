import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface HolePunch {
  type?: HolePunch.Type
  observedAddresses: Uint8Array<ArrayBuffer>[]
}

export interface HolePunchInput {
  type?: HolePunch.Type
  observedAddresses?: Uint8Array[]
}

export namespace HolePunch {
  export enum Type {
    UNUSED = 'UNUSED',
    CONNECT = 'CONNECT',
    SYNC = 'SYNC'
  }

  enum __TypeValues {
    UNUSED = 0,
    CONNECT = 100,
    SYNC = 300
  }

  export namespace Type {
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<HolePunch, HolePunchInput>

  export const codec = (): Codec<HolePunch, HolePunchInput> => {
    if (_codec == null) {
      _codec = message<HolePunch, HolePunchInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          HolePunch.Type.codec().encode(obj.type, w)
        }

        if (obj.observedAddresses != null && obj.observedAddresses.length > 0) {
          for (const value of obj.observedAddresses) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          observedAddresses: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = HolePunch.Type.codec().decode(r)
              break
            }
            case 2: {
              if (opts.limits?.observedAddresses != null && obj.observedAddresses.length === opts.limits.observedAddresses) {
                throw new MaxLengthError('Decode error - repeated field "observedAddresses" had too many elements')
              }

              obj.observedAddresses.push(r.bytes())
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
          observedAddresses: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'HolePunch'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: HolePunch.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              if (opts.limits?.observedAddresses != null && obj.observedAddresses === opts.limits.observedAddresses) {
                throw new MaxLengthError('Streaming decode error - repeated field "observedAddresses" had too many elements')
              }

              yield {
                field: `${prefix}observedAddresses[]`,
                index: obj.observedAddresses,
                value: r.bytes()
              }

              obj.observedAddresses++

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
            message: 'HolePunch'
          }
        }
      })
    }

    return _codec
  }

  export interface HolePunchTypeFieldEvent {
    field: '.type'
    value: HolePunch.Type
  }

  export interface HolePunchObservedAddressesFieldEvent {
    field: '.observedAddresses[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: HolePunchInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, HolePunch.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HolePunch>): HolePunch {
    return decodeMessage(buf, HolePunch.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HolePunch>): Generator<HolePunchTypeFieldEvent | HolePunchObservedAddressesFieldEvent> {
    return streamMessage(buf, HolePunch.codec(), opts)
  }
}
