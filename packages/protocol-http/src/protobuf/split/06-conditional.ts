/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface EntityValidator {
    etag: string
    lastModified: string
    isWeak: boolean
  }

  export namespace EntityValidator {
    let _codec: Codec<EntityValidator>

    export const codec = (): Codec<EntityValidator> => {
      if (_codec == null) {
        _codec = message<EntityValidator>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.etag != null && obj.etag !== '')) {
            w.uint32(10)
            w.string(obj.etag)
          }

          if ((obj.lastModified != null && obj.lastModified !== '')) {
            w.uint32(18)
            w.string(obj.lastModified)
          }

          if ((obj.isWeak != null && obj.isWeak !== false)) {
            w.uint32(24)
            w.bool(obj.isWeak)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            etag: '',
            lastModified: '',
            isWeak: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.etag = reader.string()
                break
              }
              case 2: {
                obj.lastModified = reader.string()
                break
              }
              case 3: {
                obj.isWeak = reader.bool()
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

    export const encode = (obj: Partial<EntityValidator>): Uint8Array => {
      return encodeMessage(obj, EntityValidator.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<EntityValidator>): EntityValidator => {
      return decodeMessage(buf, EntityValidator.codec(), opts)
    }
  }

  export interface ETagList {
    etags: string[]
  }

  export namespace ETagList {
    let _codec: Codec<ETagList>

    export const codec = (): Codec<ETagList> => {
      if (_codec == null) {
        _codec = message<ETagList>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.etags != null) {
            for (const value of obj.etags) {
              w.uint32(10)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            etags: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.etags != null && obj.etags.length === opts.limits.etags) {
                  throw new MaxLengthError('Decode error - map field "etags" had too many elements')
                }

                obj.etags.push(reader.string())
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

    export const encode = (obj: Partial<ETagList>): Uint8Array => {
      return encodeMessage(obj, ETagList.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ETagList>): ETagList => {
      return decodeMessage(buf, ETagList.codec(), opts)
    }
  }

  export interface ConditionalRequest {
    ifMatchAny: boolean
    ifMatchTags?: http.ETagList
    ifNoneMatchAny: boolean
    ifNoneMatchTags?: http.ETagList
    ifModifiedSince: string
    ifUnmodifiedSince: string
    ifRangeEtag: string
    ifRangeDate: string
  }

  export namespace ConditionalRequest {
    let _codec: Codec<ConditionalRequest>

    export const codec = (): Codec<ConditionalRequest> => {
      if (_codec == null) {
        _codec = message<ConditionalRequest>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.ifMatchAny != null && obj.ifMatchAny !== false)) {
            w.uint32(8)
            w.bool(obj.ifMatchAny)
          }

          if (obj.ifMatchTags != null) {
            w.uint32(18)
            http.ETagList.codec().encode(obj.ifMatchTags, w)
          }

          if ((obj.ifNoneMatchAny != null && obj.ifNoneMatchAny !== false)) {
            w.uint32(24)
            w.bool(obj.ifNoneMatchAny)
          }

          if (obj.ifNoneMatchTags != null) {
            w.uint32(34)
            http.ETagList.codec().encode(obj.ifNoneMatchTags, w)
          }

          if ((obj.ifModifiedSince != null && obj.ifModifiedSince !== '')) {
            w.uint32(42)
            w.string(obj.ifModifiedSince)
          }

          if ((obj.ifUnmodifiedSince != null && obj.ifUnmodifiedSince !== '')) {
            w.uint32(50)
            w.string(obj.ifUnmodifiedSince)
          }

          if ((obj.ifRangeEtag != null && obj.ifRangeEtag !== '')) {
            w.uint32(58)
            w.string(obj.ifRangeEtag)
          }

          if ((obj.ifRangeDate != null && obj.ifRangeDate !== '')) {
            w.uint32(66)
            w.string(obj.ifRangeDate)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            ifMatchAny: false,
            ifNoneMatchAny: false,
            ifModifiedSince: '',
            ifUnmodifiedSince: '',
            ifRangeEtag: '',
            ifRangeDate: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.ifMatchAny = reader.bool()
                break
              }
              case 2: {
                obj.ifMatchTags = http.ETagList.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.ifMatchTags
                })
                break
              }
              case 3: {
                obj.ifNoneMatchAny = reader.bool()
                break
              }
              case 4: {
                obj.ifNoneMatchTags = http.ETagList.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.ifNoneMatchTags
                })
                break
              }
              case 5: {
                obj.ifModifiedSince = reader.string()
                break
              }
              case 6: {
                obj.ifUnmodifiedSince = reader.string()
                break
              }
              case 7: {
                obj.ifRangeEtag = reader.string()
                break
              }
              case 8: {
                obj.ifRangeDate = reader.string()
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

    export const encode = (obj: Partial<ConditionalRequest>): Uint8Array => {
      return encodeMessage(obj, ConditionalRequest.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConditionalRequest>): ConditionalRequest => {
      return decodeMessage(buf, ConditionalRequest.codec(), opts)
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
