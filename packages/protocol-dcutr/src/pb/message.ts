import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface HolePunch {
  type?: HolePunch.Type
  observedAddresses: Uint8Array[]
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
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<HolePunch>

  export const codec = (): Codec<HolePunch> => {
    if (_codec == null) {
      _codec = message<HolePunch>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          HolePunch.Type.codec().encode(obj.type, w)
        }

        if (obj.observedAddresses != null) {
          for (const value of obj.observedAddresses) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          observedAddresses: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = HolePunch.Type.codec().decode(reader)
              break
            }
            case 2: {
              if (opts.limits?.observedAddresses != null && obj.observedAddresses.length === opts.limits.observedAddresses) {
                throw new MaxLengthError('Decode error - map field "observedAddresses" had too many elements')
              }

              obj.observedAddresses.push(reader.bytes())
              break
            }
            default: {
              reader.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Partial<HolePunch>): Uint8Array => {
    return encodeMessage(obj, HolePunch.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HolePunch>): HolePunch => {
    return decodeMessage(buf, HolePunch.codec(), opts)
  }
}
