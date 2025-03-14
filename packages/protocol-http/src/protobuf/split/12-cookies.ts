/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface NameValuePair {
    name: string
    value: string
  }

  export namespace NameValuePair {
    let _codec: Codec<NameValuePair>

    export const codec = (): Codec<NameValuePair> => {
      if (_codec == null) {
        _codec = message<NameValuePair>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.name != null && obj.name !== '')) {
            w.uint32(10)
            w.string(obj.name)
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
            name: '',
            value: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.name = reader.string()
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

    export const encode = (obj: Partial<NameValuePair>): Uint8Array => {
      return encodeMessage(obj, NameValuePair.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<NameValuePair>): NameValuePair => {
      return decodeMessage(buf, NameValuePair.codec(), opts)
    }
  }

  export interface Cookie {
    name: string
    value: string
    domain: string
    path: string
    expires: bigint
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: http.Cookie.SameSitePolicy
    extensions: http.Cookie.CookieExtension[]
  }

  export namespace Cookie {
    export enum SameSitePolicy {
      NONE = 'NONE',
      LAX = 'LAX',
      STRICT = 'STRICT'
    }

    enum __SameSitePolicyValues {
      NONE = 0,
      LAX = 1,
      STRICT = 2
    }

    export namespace SameSitePolicy {
      export const codec = (): Codec<SameSitePolicy> => {
        return enumeration<SameSitePolicy>(__SameSitePolicyValues)
      }
    }

    export interface CookieExtension {
      name: string
      value: string
    }

    export namespace CookieExtension {
      let _codec: Codec<CookieExtension>

      export const codec = (): Codec<CookieExtension> => {
        if (_codec == null) {
          _codec = message<CookieExtension>((obj, w, opts = {}) => {
            if (opts.lengthDelimited !== false) {
              w.fork()
            }

            if ((obj.name != null && obj.name !== '')) {
              w.uint32(10)
              w.string(obj.name)
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
              name: '',
              value: ''
            }

            const end = length == null ? reader.len : reader.pos + length

            while (reader.pos < end) {
              const tag = reader.uint32()

              switch (tag >>> 3) {
                case 1: {
                  obj.name = reader.string()
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

      export const encode = (obj: Partial<CookieExtension>): Uint8Array => {
        return encodeMessage(obj, CookieExtension.codec())
      }

      export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CookieExtension>): CookieExtension => {
        return decodeMessage(buf, CookieExtension.codec(), opts)
      }
    }

    let _codec: Codec<Cookie>

    export const codec = (): Codec<Cookie> => {
      if (_codec == null) {
        _codec = message<Cookie>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.name != null && obj.name !== '')) {
            w.uint32(10)
            w.string(obj.name)
          }

          if ((obj.value != null && obj.value !== '')) {
            w.uint32(18)
            w.string(obj.value)
          }

          if ((obj.domain != null && obj.domain !== '')) {
            w.uint32(26)
            w.string(obj.domain)
          }

          if ((obj.path != null && obj.path !== '')) {
            w.uint32(34)
            w.string(obj.path)
          }

          if ((obj.expires != null && obj.expires !== 0n)) {
            w.uint32(40)
            w.int64(obj.expires)
          }

          if ((obj.maxAge != null && obj.maxAge !== 0)) {
            w.uint32(48)
            w.int32(obj.maxAge)
          }

          if ((obj.secure != null && obj.secure !== false)) {
            w.uint32(56)
            w.bool(obj.secure)
          }

          if ((obj.httpOnly != null && obj.httpOnly !== false)) {
            w.uint32(64)
            w.bool(obj.httpOnly)
          }

          if (obj.sameSite != null && __SameSitePolicyValues[obj.sameSite] !== 0) {
            w.uint32(72)
            http.Cookie.SameSitePolicy.codec().encode(obj.sameSite, w)
          }

          if (obj.extensions != null) {
            for (const value of obj.extensions) {
              w.uint32(82)
              http.Cookie.CookieExtension.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            name: '',
            value: '',
            domain: '',
            path: '',
            expires: 0n,
            maxAge: 0,
            secure: false,
            httpOnly: false,
            sameSite: SameSitePolicy.NONE,
            extensions: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.name = reader.string()
                break
              }
              case 2: {
                obj.value = reader.string()
                break
              }
              case 3: {
                obj.domain = reader.string()
                break
              }
              case 4: {
                obj.path = reader.string()
                break
              }
              case 5: {
                obj.expires = reader.int64()
                break
              }
              case 6: {
                obj.maxAge = reader.int32()
                break
              }
              case 7: {
                obj.secure = reader.bool()
                break
              }
              case 8: {
                obj.httpOnly = reader.bool()
                break
              }
              case 9: {
                obj.sameSite = http.Cookie.SameSitePolicy.codec().decode(reader)
                break
              }
              case 10: {
                if (opts.limits?.extensions != null && obj.extensions.length === opts.limits.extensions) {
                  throw new MaxLengthError('Decode error - map field "extensions" had too many elements')
                }

                obj.extensions.push(http.Cookie.CookieExtension.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.extensions$
                }))
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

    export const encode = (obj: Partial<Cookie>): Uint8Array => {
      return encodeMessage(obj, Cookie.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Cookie>): Cookie => {
      return decodeMessage(buf, Cookie.codec(), opts)
    }
  }

  export interface SetCookie {
    cookie?: http.Cookie
  }

  export namespace SetCookie {
    let _codec: Codec<SetCookie>

    export const codec = (): Codec<SetCookie> => {
      if (_codec == null) {
        _codec = message<SetCookie>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.cookie != null) {
            w.uint32(10)
            http.Cookie.codec().encode(obj.cookie, w)
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
                obj.cookie = http.Cookie.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.cookie
                })
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

    export const encode = (obj: Partial<SetCookie>): Uint8Array => {
      return encodeMessage(obj, SetCookie.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SetCookie>): SetCookie => {
      return decodeMessage(buf, SetCookie.codec(), opts)
    }
  }

  export interface CookieHeader {
    cookies: http.NameValuePair[]
  }

  export namespace CookieHeader {
    let _codec: Codec<CookieHeader>

    export const codec = (): Codec<CookieHeader> => {
      if (_codec == null) {
        _codec = message<CookieHeader>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.cookies != null) {
            for (const value of obj.cookies) {
              w.uint32(10)
              http.NameValuePair.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            cookies: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.cookies != null && obj.cookies.length === opts.limits.cookies) {
                  throw new MaxLengthError('Decode error - map field "cookies" had too many elements')
                }

                obj.cookies.push(http.NameValuePair.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.cookies$
                }))
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

    export const encode = (obj: Partial<CookieHeader>): Uint8Array => {
      return encodeMessage(obj, CookieHeader.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CookieHeader>): CookieHeader => {
      return decodeMessage(buf, CookieHeader.codec(), opts)
    }
  }

  export interface CookieJar {
    cookies: http.Cookie[]
  }

  export namespace CookieJar {
    let _codec: Codec<CookieJar>

    export const codec = (): Codec<CookieJar> => {
      if (_codec == null) {
        _codec = message<CookieJar>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.cookies != null) {
            for (const value of obj.cookies) {
              w.uint32(10)
              http.Cookie.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            cookies: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.cookies != null && obj.cookies.length === opts.limits.cookies) {
                  throw new MaxLengthError('Decode error - map field "cookies" had too many elements')
                }

                obj.cookies.push(http.Cookie.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.cookies$
                }))
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

    export const encode = (obj: Partial<CookieJar>): Uint8Array => {
      return encodeMessage(obj, CookieJar.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CookieJar>): CookieJar => {
      return decodeMessage(buf, CookieJar.codec(), opts)
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
