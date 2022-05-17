/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, string, enumeration, bytes } from 'protons-runtime'
import type { Codec } from 'protons-runtime'

export interface FetchRequest {
  identifier: string
}

export namespace FetchRequest {
  export const codec = (): Codec<FetchRequest> => {
    return message<FetchRequest>({
      1: { name: 'identifier', codec: string }
    })
  }

  export const encode = (obj: FetchRequest): Uint8Array => {
    return encodeMessage(obj, FetchRequest.codec())
  }

  export const decode = (buf: Uint8Array): FetchRequest => {
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
      return enumeration<typeof StatusCode>(__StatusCodeValues)
    }
  }

  export const codec = (): Codec<FetchResponse> => {
    return message<FetchResponse>({
      1: { name: 'status', codec: FetchResponse.StatusCode.codec() },
      2: { name: 'data', codec: bytes }
    })
  }

  export const encode = (obj: FetchResponse): Uint8Array => {
    return encodeMessage(obj, FetchResponse.codec())
  }

  export const decode = (buf: Uint8Array): FetchResponse => {
    return decodeMessage(buf, FetchResponse.codec())
  }
}
