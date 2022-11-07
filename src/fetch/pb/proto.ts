/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */

import { encodeMessage, decodeMessage, message, enumeration } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface FetchRequest {
  identifier: string
}

export namespace FetchRequest {
  let _codec: Codec<FetchRequest>

  export const codec = (): Codec<FetchRequest> => {
    if (_codec == null) {
      _codec = message<FetchRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || obj.identifier !== '') {
          w.uint32(10)
          w.string(obj.identifier)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          identifier: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.identifier = reader.string()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: FetchRequest): Uint8Array => {
    return encodeMessage(obj, FetchRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): FetchRequest => {
    return decodeMessage(buf, FetchRequest.codec())
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
    export const codec = () => {
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

        if (opts.writeDefaults === true || (obj.status != null && __StatusCodeValues[obj.status] !== 0)) {
          w.uint32(8)
          FetchResponse.StatusCode.codec().encode(obj.status, w)
        }

        if (opts.writeDefaults === true || (obj.data != null && obj.data.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          status: StatusCode.OK,
          data: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.status = FetchResponse.StatusCode.codec().decode(reader)
              break
            case 2:
              obj.data = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: FetchResponse): Uint8Array => {
    return encodeMessage(obj, FetchResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): FetchResponse => {
    return decodeMessage(buf, FetchResponse.codec())
  }
}
