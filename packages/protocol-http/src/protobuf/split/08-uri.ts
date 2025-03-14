/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface Uri {
    scheme: string
    authority: string
    path: string
    query: string
    fragment: string
  }

  export namespace Uri {
    let _codec: Codec<Uri>

    export const codec = (): Codec<Uri> => {
      if (_codec == null) {
        _codec = message<Uri>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.scheme != null && obj.scheme !== '')) {
            w.uint32(10)
            w.string(obj.scheme)
          }

          if ((obj.authority != null && obj.authority !== '')) {
            w.uint32(18)
            w.string(obj.authority)
          }

          if ((obj.path != null && obj.path !== '')) {
            w.uint32(26)
            w.string(obj.path)
          }

          if ((obj.query != null && obj.query !== '')) {
            w.uint32(34)
            w.string(obj.query)
          }

          if ((obj.fragment != null && obj.fragment !== '')) {
            w.uint32(42)
            w.string(obj.fragment)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            scheme: '',
            authority: '',
            path: '',
            query: '',
            fragment: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.scheme = reader.string()
                break
              }
              case 2: {
                obj.authority = reader.string()
                break
              }
              case 3: {
                obj.path = reader.string()
                break
              }
              case 4: {
                obj.query = reader.string()
                break
              }
              case 5: {
                obj.fragment = reader.string()
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

    export const encode = (obj: Partial<Uri>): Uint8Array => {
      return encodeMessage(obj, Uri.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Uri>): Uri => {
      return decodeMessage(buf, Uri.codec(), opts)
    }
  }

  export interface Origin {
    scheme: string
    host: string
    port: number
  }

  export namespace Origin {
    let _codec: Codec<Origin>

    export const codec = (): Codec<Origin> => {
      if (_codec == null) {
        _codec = message<Origin>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.scheme != null && obj.scheme !== '')) {
            w.uint32(10)
            w.string(obj.scheme)
          }

          if ((obj.host != null && obj.host !== '')) {
            w.uint32(18)
            w.string(obj.host)
          }

          if ((obj.port != null && obj.port !== 0)) {
            w.uint32(24)
            w.int32(obj.port)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            scheme: '',
            host: '',
            port: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.scheme = reader.string()
                break
              }
              case 2: {
                obj.host = reader.string()
                break
              }
              case 3: {
                obj.port = reader.int32()
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

    export const encode = (obj: Partial<Origin>): Uint8Array => {
      return encodeMessage(obj, Origin.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Origin>): Origin => {
      return decodeMessage(buf, Origin.codec(), opts)
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
