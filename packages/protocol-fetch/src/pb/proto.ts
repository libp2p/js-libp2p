import { decodeMessage, encodeMessage, enumeration, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface FetchRequest {
  identifier: Uint8Array
}

export namespace FetchRequest {
  let _codec: Codec<FetchRequest>

  export const codec = (): Codec<FetchRequest> => {
    if (_codec == null) {
      _codec = message<FetchRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.identifier != null && obj.identifier.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.identifier)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          identifier: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.identifier = reader.bytes()
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

  export const encode = (obj: Partial<FetchRequest>): Uint8Array => {
    return encodeMessage(obj, FetchRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<FetchRequest>): FetchRequest => {
    return decodeMessage(buf, FetchRequest.codec(), opts)
  }
}

export interface FetchResponse {
  status: FetchResponse.StatusCode
  data: Uint8Array
}

export namespace FetchResponse {
  export enum StatusCode {
    OK = 'OK',
    NOT_FOUND = 'NOT_FOUND',
    ERROR = 'ERROR'
  }

  enum __StatusCodeValues {
    OK = 0,
    NOT_FOUND = 1,
    ERROR = 2
  }

  export namespace StatusCode {
    export const codec = (): Codec<StatusCode> => {
      return enumeration<StatusCode>(__StatusCodeValues)
    }
  }

  let _codec: Codec<FetchResponse>

  export const codec = (): Codec<FetchResponse> => {
    if (_codec == null) {
      _codec = message<FetchResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.status != null && __StatusCodeValues[obj.status] !== 0) {
          w.uint32(8)
          FetchResponse.StatusCode.codec().encode(obj.status, w)
        }

        if ((obj.data != null && obj.data.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          status: StatusCode.OK,
          data: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.status = FetchResponse.StatusCode.codec().decode(reader)
              break
            }
            case 2: {
              obj.data = reader.bytes()
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

  export const encode = (obj: Partial<FetchResponse>): Uint8Array => {
    return encodeMessage(obj, FetchResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<FetchResponse>): FetchResponse => {
    return decodeMessage(buf, FetchResponse.codec(), opts)
  }
}
