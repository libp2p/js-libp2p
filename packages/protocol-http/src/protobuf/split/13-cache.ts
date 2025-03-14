/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface CacheExtensionDirective {
    name: string
    value: string
  }

  export namespace CacheExtensionDirective {
    let _codec: Codec<CacheExtensionDirective>

    export const codec = (): Codec<CacheExtensionDirective> => {
      if (_codec == null) {
        _codec = message<CacheExtensionDirective>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<CacheExtensionDirective>): Uint8Array => {
      return encodeMessage(obj, CacheExtensionDirective.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CacheExtensionDirective>): CacheExtensionDirective => {
      return decodeMessage(buf, CacheExtensionDirective.codec(), opts)
    }
  }

  export interface CacheControl {
    noCache: boolean
    noStore: boolean
    maxAgeSet: boolean
    maxAge: number
    maxStaleSet: boolean
    maxStale: number
    minFreshSet: boolean
    minFresh: number
    noTransform: boolean
    onlyIfCached: boolean
    mustRevalidate: boolean
    mustUnderstand: boolean
    proxyRevalidate: boolean
    sMaxageSet: boolean
    sMaxage: number
    immutable: boolean
    extensions: http.CacheExtensionDirective[]
    privateFields: string[]
    noCacheFields: string[]
  }

  export namespace CacheControl {
    let _codec: Codec<CacheControl>

    export const codec = (): Codec<CacheControl> => {
      if (_codec == null) {
        _codec = message<CacheControl>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.noCache != null && obj.noCache !== false)) {
            w.uint32(8)
            w.bool(obj.noCache)
          }

          if ((obj.noStore != null && obj.noStore !== false)) {
            w.uint32(16)
            w.bool(obj.noStore)
          }

          if ((obj.maxAgeSet != null && obj.maxAgeSet !== false)) {
            w.uint32(24)
            w.bool(obj.maxAgeSet)
          }

          if ((obj.maxAge != null && obj.maxAge !== 0)) {
            w.uint32(32)
            w.int32(obj.maxAge)
          }

          if ((obj.maxStaleSet != null && obj.maxStaleSet !== false)) {
            w.uint32(40)
            w.bool(obj.maxStaleSet)
          }

          if ((obj.maxStale != null && obj.maxStale !== 0)) {
            w.uint32(48)
            w.int32(obj.maxStale)
          }

          if ((obj.minFreshSet != null && obj.minFreshSet !== false)) {
            w.uint32(56)
            w.bool(obj.minFreshSet)
          }

          if ((obj.minFresh != null && obj.minFresh !== 0)) {
            w.uint32(64)
            w.int32(obj.minFresh)
          }

          if ((obj.noTransform != null && obj.noTransform !== false)) {
            w.uint32(72)
            w.bool(obj.noTransform)
          }

          if ((obj.onlyIfCached != null && obj.onlyIfCached !== false)) {
            w.uint32(80)
            w.bool(obj.onlyIfCached)
          }

          if ((obj.mustRevalidate != null && obj.mustRevalidate !== false)) {
            w.uint32(88)
            w.bool(obj.mustRevalidate)
          }

          if ((obj.mustUnderstand != null && obj.mustUnderstand !== false)) {
            w.uint32(96)
            w.bool(obj.mustUnderstand)
          }

          if ((obj.proxyRevalidate != null && obj.proxyRevalidate !== false)) {
            w.uint32(104)
            w.bool(obj.proxyRevalidate)
          }

          if ((obj.sMaxageSet != null && obj.sMaxageSet !== false)) {
            w.uint32(112)
            w.bool(obj.sMaxageSet)
          }

          if ((obj.sMaxage != null && obj.sMaxage !== 0)) {
            w.uint32(120)
            w.int32(obj.sMaxage)
          }

          if ((obj.immutable != null && obj.immutable !== false)) {
            w.uint32(128)
            w.bool(obj.immutable)
          }

          if (obj.extensions != null) {
            for (const value of obj.extensions) {
              w.uint32(138)
              http.CacheExtensionDirective.codec().encode(value, w)
            }
          }

          if (obj.privateFields != null) {
            for (const value of obj.privateFields) {
              w.uint32(146)
              w.string(value)
            }
          }

          if (obj.noCacheFields != null) {
            for (const value of obj.noCacheFields) {
              w.uint32(154)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            noCache: false,
            noStore: false,
            maxAgeSet: false,
            maxAge: 0,
            maxStaleSet: false,
            maxStale: 0,
            minFreshSet: false,
            minFresh: 0,
            noTransform: false,
            onlyIfCached: false,
            mustRevalidate: false,
            mustUnderstand: false,
            proxyRevalidate: false,
            sMaxageSet: false,
            sMaxage: 0,
            immutable: false,
            extensions: [],
            privateFields: [],
            noCacheFields: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.noCache = reader.bool()
                break
              }
              case 2: {
                obj.noStore = reader.bool()
                break
              }
              case 3: {
                obj.maxAgeSet = reader.bool()
                break
              }
              case 4: {
                obj.maxAge = reader.int32()
                break
              }
              case 5: {
                obj.maxStaleSet = reader.bool()
                break
              }
              case 6: {
                obj.maxStale = reader.int32()
                break
              }
              case 7: {
                obj.minFreshSet = reader.bool()
                break
              }
              case 8: {
                obj.minFresh = reader.int32()
                break
              }
              case 9: {
                obj.noTransform = reader.bool()
                break
              }
              case 10: {
                obj.onlyIfCached = reader.bool()
                break
              }
              case 11: {
                obj.mustRevalidate = reader.bool()
                break
              }
              case 12: {
                obj.mustUnderstand = reader.bool()
                break
              }
              case 13: {
                obj.proxyRevalidate = reader.bool()
                break
              }
              case 14: {
                obj.sMaxageSet = reader.bool()
                break
              }
              case 15: {
                obj.sMaxage = reader.int32()
                break
              }
              case 16: {
                obj.immutable = reader.bool()
                break
              }
              case 17: {
                if (opts.limits?.extensions != null && obj.extensions.length === opts.limits.extensions) {
                  throw new MaxLengthError('Decode error - map field "extensions" had too many elements')
                }

                obj.extensions.push(http.CacheExtensionDirective.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.extensions$
                }))
                break
              }
              case 18: {
                if (opts.limits?.privateFields != null && obj.privateFields.length === opts.limits.privateFields) {
                  throw new MaxLengthError('Decode error - map field "privateFields" had too many elements')
                }

                obj.privateFields.push(reader.string())
                break
              }
              case 19: {
                if (opts.limits?.noCacheFields != null && obj.noCacheFields.length === opts.limits.noCacheFields) {
                  throw new MaxLengthError('Decode error - map field "noCacheFields" had too many elements')
                }

                obj.noCacheFields.push(reader.string())
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

    export const encode = (obj: Partial<CacheControl>): Uint8Array => {
      return encodeMessage(obj, CacheControl.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CacheControl>): CacheControl => {
      return decodeMessage(buf, CacheControl.codec(), opts)
    }
  }

  export interface CacheFreshness {
    maxAgeSeconds: number
    sMaxageSeconds: number
    expiresTime: bigint
    dateTime: bigint
    lastModifiedTime: bigint
    freshnessLifetimeSeconds: number
    ageSeconds: number
  }

  export namespace CacheFreshness {
    let _codec: Codec<CacheFreshness>

    export const codec = (): Codec<CacheFreshness> => {
      if (_codec == null) {
        _codec = message<CacheFreshness>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.maxAgeSeconds != null && obj.maxAgeSeconds !== 0)) {
            w.uint32(8)
            w.int32(obj.maxAgeSeconds)
          }

          if ((obj.sMaxageSeconds != null && obj.sMaxageSeconds !== 0)) {
            w.uint32(16)
            w.int32(obj.sMaxageSeconds)
          }

          if ((obj.expiresTime != null && obj.expiresTime !== 0n)) {
            w.uint32(24)
            w.int64(obj.expiresTime)
          }

          if ((obj.dateTime != null && obj.dateTime !== 0n)) {
            w.uint32(32)
            w.int64(obj.dateTime)
          }

          if ((obj.lastModifiedTime != null && obj.lastModifiedTime !== 0n)) {
            w.uint32(40)
            w.int64(obj.lastModifiedTime)
          }

          if ((obj.freshnessLifetimeSeconds != null && obj.freshnessLifetimeSeconds !== 0)) {
            w.uint32(48)
            w.int32(obj.freshnessLifetimeSeconds)
          }

          if ((obj.ageSeconds != null && obj.ageSeconds !== 0)) {
            w.uint32(56)
            w.int32(obj.ageSeconds)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            maxAgeSeconds: 0,
            sMaxageSeconds: 0,
            expiresTime: 0n,
            dateTime: 0n,
            lastModifiedTime: 0n,
            freshnessLifetimeSeconds: 0,
            ageSeconds: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.maxAgeSeconds = reader.int32()
                break
              }
              case 2: {
                obj.sMaxageSeconds = reader.int32()
                break
              }
              case 3: {
                obj.expiresTime = reader.int64()
                break
              }
              case 4: {
                obj.dateTime = reader.int64()
                break
              }
              case 5: {
                obj.lastModifiedTime = reader.int64()
                break
              }
              case 6: {
                obj.freshnessLifetimeSeconds = reader.int32()
                break
              }
              case 7: {
                obj.ageSeconds = reader.int32()
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

    export const encode = (obj: Partial<CacheFreshness>): Uint8Array => {
      return encodeMessage(obj, CacheFreshness.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CacheFreshness>): CacheFreshness => {
      return decodeMessage(buf, CacheFreshness.codec(), opts)
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
