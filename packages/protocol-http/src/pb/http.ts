/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, MaxSizeError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export enum OpCode {
  CONTINUATION = 'CONTINUATION',
  TEXT = 'TEXT',
  BINARY = 'BINARY',
  CLOSE = 'CLOSE',
  PING = 'PING',
  PONG = 'PONG'
}

enum __OpCodeValues {
  CONTINUATION = 0,
  TEXT = 1,
  BINARY = 2,
  CLOSE = 8,
  PING = 9,
  PONG = 10
}

export namespace OpCode {
  export const codec = (): Codec<OpCode> => {
    return enumeration<OpCode>(__OpCodeValues)
  }
}
export interface WebSocketFrame {
  fin?: boolean
  opCode?: OpCode
  mask?: boolean
  payload?: Uint8Array
}

export namespace WebSocketFrame {
  let _codec: Codec<WebSocketFrame>

  export const codec = (): Codec<WebSocketFrame> => {
    if (_codec == null) {
      _codec = message<WebSocketFrame>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.fin != null) {
          w.uint32(8)
          w.bool(obj.fin)
        }

        if (obj.opCode != null) {
          w.uint32(16)
          OpCode.codec().encode(obj.opCode, w)
        }

        if (obj.mask != null) {
          w.uint32(24)
          w.bool(obj.mask)
        }

        if (obj.payload != null) {
          w.uint32(34)
          w.bytes(obj.payload)
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
            case 1: {
              obj.fin = reader.bool()
              break
            }
            case 2: {
              obj.opCode = OpCode.codec().decode(reader)
              break
            }
            case 3: {
              obj.mask = reader.bool()
              break
            }
            case 4: {
              obj.payload = reader.bytes()
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

  export const encode = (obj: Partial<WebSocketFrame>): Uint8Array => {
    return encodeMessage(obj, WebSocketFrame.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebSocketFrame>): WebSocketFrame => {
    return decodeMessage(buf, WebSocketFrame.codec(), opts)
  }
}

export interface Request {
  method?: string
  path?: string
  headers: Map<string, string>
  body?: Uint8Array
}

export namespace Request {
  export interface Request$headersEntry {
    key: string
    value: string
  }

  export namespace Request$headersEntry {
    let _codec: Codec<Request$headersEntry>

    export const codec = (): Codec<Request$headersEntry> => {
      if (_codec == null) {
        _codec = message<Request$headersEntry>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if ((obj.value != null && obj.value !== '')) {
            w.uint32(18)
            w.string(obj.value)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: '',
            value: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                obj.value = reader.string()
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

    export const encode = (obj: Partial<Request$headersEntry>): Uint8Array => {
      return encodeMessage(obj, Request$headersEntry.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Request$headersEntry>): Request$headersEntry => {
      return decodeMessage(buf, Request$headersEntry.codec(), opts)
    }
  }

  let _codec: Codec<Request>

  export const codec = (): Codec<Request> => {
    if (_codec == null) {
      _codec = message<Request>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.method != null) {
          w.uint32(10)
          w.string(obj.method)
        }

        if (obj.path != null) {
          w.uint32(18)
          w.string(obj.path)
        }

        if (obj.headers != null && obj.headers.size !== 0) {
          for (const [key, value] of obj.headers.entries()) {
            w.uint32(26)
            Request.Request$headersEntry.codec().encode({ key, value }, w)
          }
        }

        if (obj.body != null) {
          w.uint32(34)
          w.bytes(obj.body)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          headers: new Map<string, string>()
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.method = reader.string()
              break
            }
            case 2: {
              obj.path = reader.string()
              break
            }
            case 3: {
              if (opts.limits?.headers != null && obj.headers.size === opts.limits.headers) {
                throw new MaxSizeError('Decode error - map field "headers" had too many elements')
              }

              const entry = Request.Request$headersEntry.codec().decode(reader, reader.uint32())
              obj.headers.set(entry.key, entry.value)
              break
            }
            case 4: {
              obj.body = reader.bytes()
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

  export const encode = (obj: Partial<Request>): Uint8Array => {
    return encodeMessage(obj, Request.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Request>): Request => {
    return decodeMessage(buf, Request.codec(), opts)
  }
}

export interface Response {
  statusCode?: number
  headers: Map<string, string>
  body?: Uint8Array
}

export namespace Response {
  export interface Response$headersEntry {
    key: string
    value: string
  }

  export namespace Response$headersEntry {
    let _codec: Codec<Response$headersEntry>

    export const codec = (): Codec<Response$headersEntry> => {
      if (_codec == null) {
        _codec = message<Response$headersEntry>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if ((obj.value != null && obj.value !== '')) {
            w.uint32(18)
            w.string(obj.value)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: '',
            value: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                obj.value = reader.string()
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

    export const encode = (obj: Partial<Response$headersEntry>): Uint8Array => {
      return encodeMessage(obj, Response$headersEntry.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Response$headersEntry>): Response$headersEntry => {
      return decodeMessage(buf, Response$headersEntry.codec(), opts)
    }
  }

  let _codec: Codec<Response>

  export const codec = (): Codec<Response> => {
    if (_codec == null) {
      _codec = message<Response>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.statusCode != null) {
          w.uint32(8)
          w.uint32(obj.statusCode)
        }

        if (obj.headers != null && obj.headers.size !== 0) {
          for (const [key, value] of obj.headers.entries()) {
            w.uint32(18)
            Response.Response$headersEntry.codec().encode({ key, value }, w)
          }
        }

        if (obj.body != null) {
          w.uint32(26)
          w.bytes(obj.body)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          headers: new Map<string, string>()
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.statusCode = reader.uint32()
              break
            }
            case 2: {
              if (opts.limits?.headers != null && obj.headers.size === opts.limits.headers) {
                throw new MaxSizeError('Decode error - map field "headers" had too many elements')
              }

              const entry = Response.Response$headersEntry.codec().decode(reader, reader.uint32())
              obj.headers.set(entry.key, entry.value)
              break
            }
            case 3: {
              obj.body = reader.bytes()
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

  export const encode = (obj: Partial<Response>): Uint8Array => {
    return encodeMessage(obj, Response.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Response>): Response => {
    return decodeMessage(buf, Response.codec(), opts)
  }
}
