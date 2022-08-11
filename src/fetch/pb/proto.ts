/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

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
      _codec = message<FetchRequest>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.identifier != null) {
          writer.uint32(10)
          writer.string(obj.identifier)
        } else {
          throw new Error('Protocol error: required field "identifier" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

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

        if (obj.identifier == null) {
          throw new Error('Protocol error: value for required field "identifier" was not found in protobuf')
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
      _codec = message<FetchResponse>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.status != null) {
          writer.uint32(8)
          FetchResponse.StatusCode.codec().encode(obj.status, writer)
        } else {
          throw new Error('Protocol error: required field "status" was not found in object')
        }

        if (obj.data != null) {
          writer.uint32(18)
          writer.bytes(obj.data)
        } else {
          throw new Error('Protocol error: required field "data" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

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

        if (obj.status == null) {
          throw new Error('Protocol error: value for required field "status" was not found in protobuf')
        }

        if (obj.data == null) {
          throw new Error('Protocol error: value for required field "data" was not found in protobuf')
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
