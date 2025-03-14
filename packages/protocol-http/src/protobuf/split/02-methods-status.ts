/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export enum Method {
    METHOD_UNKNOWN = 'METHOD_UNKNOWN',
    METHOD_GET = 'METHOD_GET',
    METHOD_HEAD = 'METHOD_HEAD',
    METHOD_POST = 'METHOD_POST',
    METHOD_PUT = 'METHOD_PUT',
    METHOD_DELETE = 'METHOD_DELETE',
    METHOD_CONNECT = 'METHOD_CONNECT',
    METHOD_OPTIONS = 'METHOD_OPTIONS',
    METHOD_TRACE = 'METHOD_TRACE'
  }

  enum __MethodValues {
    METHOD_UNKNOWN = 0,
    METHOD_GET = 1,
    METHOD_HEAD = 2,
    METHOD_POST = 3,
    METHOD_PUT = 4,
    METHOD_DELETE = 5,
    METHOD_CONNECT = 6,
    METHOD_OPTIONS = 7,
    METHOD_TRACE = 8
  }

  export namespace Method {
    export const codec = (): Codec<Method> => {
      return enumeration<Method>(__MethodValues)
    }
  }

  export interface MethodProperties {
    method: http.Method
    isSafe: boolean
    isIdempotent: boolean
    isCacheable: boolean
  }

  export namespace MethodProperties {
    let _codec: Codec<MethodProperties>

    export const codec = (): Codec<MethodProperties> => {
      if (_codec == null) {
        _codec = message<MethodProperties>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.method != null && __MethodValues[obj.method] !== 0) {
            w.uint32(8)
            http.Method.codec().encode(obj.method, w)
          }

          if ((obj.isSafe != null && obj.isSafe !== false)) {
            w.uint32(16)
            w.bool(obj.isSafe)
          }

          if ((obj.isIdempotent != null && obj.isIdempotent !== false)) {
            w.uint32(24)
            w.bool(obj.isIdempotent)
          }

          if ((obj.isCacheable != null && obj.isCacheable !== false)) {
            w.uint32(32)
            w.bool(obj.isCacheable)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            method: Method.METHOD_UNKNOWN,
            isSafe: false,
            isIdempotent: false,
            isCacheable: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.method = http.Method.codec().decode(reader)
                break
              }
              case 2: {
                obj.isSafe = reader.bool()
                break
              }
              case 3: {
                obj.isIdempotent = reader.bool()
                break
              }
              case 4: {
                obj.isCacheable = reader.bool()
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

    export const encode = (obj: Partial<MethodProperties>): Uint8Array => {
      return encodeMessage(obj, MethodProperties.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MethodProperties>): MethodProperties => {
      return decodeMessage(buf, MethodProperties.codec(), opts)
    }
  }

  export enum StatusCode {
    STATUS_UNKNOWN = 'STATUS_UNKNOWN',
    STATUS_CONTINUE = 'STATUS_CONTINUE',
    STATUS_SWITCHING_PROTOCOLS = 'STATUS_SWITCHING_PROTOCOLS',
    STATUS_OK = 'STATUS_OK',
    STATUS_CREATED = 'STATUS_CREATED',
    STATUS_ACCEPTED = 'STATUS_ACCEPTED',
    STATUS_NON_AUTHORITATIVE_INFORMATION = 'STATUS_NON_AUTHORITATIVE_INFORMATION',
    STATUS_NO_CONTENT = 'STATUS_NO_CONTENT',
    STATUS_RESET_CONTENT = 'STATUS_RESET_CONTENT',
    STATUS_PARTIAL_CONTENT = 'STATUS_PARTIAL_CONTENT',
    STATUS_MULTIPLE_CHOICES = 'STATUS_MULTIPLE_CHOICES',
    STATUS_MOVED_PERMANENTLY = 'STATUS_MOVED_PERMANENTLY',
    STATUS_FOUND = 'STATUS_FOUND',
    STATUS_SEE_OTHER = 'STATUS_SEE_OTHER',
    STATUS_NOT_MODIFIED = 'STATUS_NOT_MODIFIED',
    STATUS_USE_PROXY = 'STATUS_USE_PROXY',
    STATUS_TEMPORARY_REDIRECT = 'STATUS_TEMPORARY_REDIRECT',
    STATUS_PERMANENT_REDIRECT = 'STATUS_PERMANENT_REDIRECT',
    STATUS_BAD_REQUEST = 'STATUS_BAD_REQUEST',
    STATUS_UNAUTHORIZED = 'STATUS_UNAUTHORIZED',
    STATUS_PAYMENT_REQUIRED = 'STATUS_PAYMENT_REQUIRED',
    STATUS_FORBIDDEN = 'STATUS_FORBIDDEN',
    STATUS_NOT_FOUND = 'STATUS_NOT_FOUND',
    STATUS_METHOD_NOT_ALLOWED = 'STATUS_METHOD_NOT_ALLOWED',
    STATUS_NOT_ACCEPTABLE = 'STATUS_NOT_ACCEPTABLE',
    STATUS_PROXY_AUTHENTICATION_REQUIRED = 'STATUS_PROXY_AUTHENTICATION_REQUIRED',
    STATUS_REQUEST_TIMEOUT = 'STATUS_REQUEST_TIMEOUT',
    STATUS_CONFLICT = 'STATUS_CONFLICT',
    STATUS_GONE = 'STATUS_GONE',
    STATUS_LENGTH_REQUIRED = 'STATUS_LENGTH_REQUIRED',
    STATUS_PRECONDITION_FAILED = 'STATUS_PRECONDITION_FAILED',
    STATUS_CONTENT_TOO_LARGE = 'STATUS_CONTENT_TOO_LARGE',
    STATUS_URI_TOO_LONG = 'STATUS_URI_TOO_LONG',
    STATUS_UNSUPPORTED_MEDIA_TYPE = 'STATUS_UNSUPPORTED_MEDIA_TYPE',
    STATUS_RANGE_NOT_SATISFIABLE = 'STATUS_RANGE_NOT_SATISFIABLE',
    STATUS_EXPECTATION_FAILED = 'STATUS_EXPECTATION_FAILED',
    STATUS_MISDIRECTED_REQUEST = 'STATUS_MISDIRECTED_REQUEST',
    STATUS_UNPROCESSABLE_CONTENT = 'STATUS_UNPROCESSABLE_CONTENT',
    STATUS_UPGRADE_REQUIRED = 'STATUS_UPGRADE_REQUIRED',
    STATUS_INTERNAL_SERVER_ERROR = 'STATUS_INTERNAL_SERVER_ERROR',
    STATUS_NOT_IMPLEMENTED = 'STATUS_NOT_IMPLEMENTED',
    STATUS_BAD_GATEWAY = 'STATUS_BAD_GATEWAY',
    STATUS_SERVICE_UNAVAILABLE = 'STATUS_SERVICE_UNAVAILABLE',
    STATUS_GATEWAY_TIMEOUT = 'STATUS_GATEWAY_TIMEOUT',
    STATUS_HTTP_VERSION_NOT_SUPPORTED = 'STATUS_HTTP_VERSION_NOT_SUPPORTED'
  }

  enum __StatusCodeValues {
    STATUS_UNKNOWN = 0,
    STATUS_CONTINUE = 100,
    STATUS_SWITCHING_PROTOCOLS = 101,
    STATUS_OK = 200,
    STATUS_CREATED = 201,
    STATUS_ACCEPTED = 202,
    STATUS_NON_AUTHORITATIVE_INFORMATION = 203,
    STATUS_NO_CONTENT = 204,
    STATUS_RESET_CONTENT = 205,
    STATUS_PARTIAL_CONTENT = 206,
    STATUS_MULTIPLE_CHOICES = 300,
    STATUS_MOVED_PERMANENTLY = 301,
    STATUS_FOUND = 302,
    STATUS_SEE_OTHER = 303,
    STATUS_NOT_MODIFIED = 304,
    STATUS_USE_PROXY = 305,
    STATUS_TEMPORARY_REDIRECT = 307,
    STATUS_PERMANENT_REDIRECT = 308,
    STATUS_BAD_REQUEST = 400,
    STATUS_UNAUTHORIZED = 401,
    STATUS_PAYMENT_REQUIRED = 402,
    STATUS_FORBIDDEN = 403,
    STATUS_NOT_FOUND = 404,
    STATUS_METHOD_NOT_ALLOWED = 405,
    STATUS_NOT_ACCEPTABLE = 406,
    STATUS_PROXY_AUTHENTICATION_REQUIRED = 407,
    STATUS_REQUEST_TIMEOUT = 408,
    STATUS_CONFLICT = 409,
    STATUS_GONE = 410,
    STATUS_LENGTH_REQUIRED = 411,
    STATUS_PRECONDITION_FAILED = 412,
    STATUS_CONTENT_TOO_LARGE = 413,
    STATUS_URI_TOO_LONG = 414,
    STATUS_UNSUPPORTED_MEDIA_TYPE = 415,
    STATUS_RANGE_NOT_SATISFIABLE = 416,
    STATUS_EXPECTATION_FAILED = 417,
    STATUS_MISDIRECTED_REQUEST = 421,
    STATUS_UNPROCESSABLE_CONTENT = 422,
    STATUS_UPGRADE_REQUIRED = 426,
    STATUS_INTERNAL_SERVER_ERROR = 500,
    STATUS_NOT_IMPLEMENTED = 501,
    STATUS_BAD_GATEWAY = 502,
    STATUS_SERVICE_UNAVAILABLE = 503,
    STATUS_GATEWAY_TIMEOUT = 504,
    STATUS_HTTP_VERSION_NOT_SUPPORTED = 505
  }

  export namespace StatusCode {
    export const codec = (): Codec<StatusCode> => {
      return enumeration<StatusCode>(__StatusCodeValues)
    }
  }

  export enum IntermediaryType {
    PROXY = 'PROXY',
    GATEWAY = 'GATEWAY',
    TUNNEL = 'TUNNEL',
    CACHE = 'CACHE'
  }

  enum __IntermediaryTypeValues {
    PROXY = 0,
    GATEWAY = 1,
    TUNNEL = 2,
    CACHE = 3
  }

  export namespace IntermediaryType {
    export const codec = (): Codec<IntermediaryType> => {
      return enumeration<IntermediaryType>(__IntermediaryTypeValues)
    }
  }

  let _codec: Codec<http>

  export const codec = (): Codec<http> => {
    if (_codec == null) {
      _codec = message<http>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
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

  export const encode = (obj: Partial<http>): Uint8Array => {
    return encodeMessage(obj, http.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<http>): http => {
    return decodeMessage(buf, http.codec(), opts)
  }
}
