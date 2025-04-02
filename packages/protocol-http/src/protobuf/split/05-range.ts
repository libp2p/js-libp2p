/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface ByteRangeSpec {
    firstPos: bigint
    lastPos: bigint
  }

  export namespace ByteRangeSpec {
    let _codec: Codec<ByteRangeSpec>

    export const codec = (): Codec<ByteRangeSpec> => {
      if (_codec == null) {
        _codec = message<ByteRangeSpec>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.firstPos != null && obj.firstPos !== 0n)) {
            w.uint32(8)
            w.int64(obj.firstPos)
          }

          if ((obj.lastPos != null && obj.lastPos !== 0n)) {
            w.uint32(16)
            w.int64(obj.lastPos)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            firstPos: 0n,
            lastPos: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.firstPos = reader.int64()
                break
              }
              case 2: {
                obj.lastPos = reader.int64()
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

    export const encode = (obj: Partial<ByteRangeSpec>): Uint8Array => {
      return encodeMessage(obj, ByteRangeSpec.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ByteRangeSpec>): ByteRangeSpec => {
      return decodeMessage(buf, ByteRangeSpec.codec(), opts)
    }
  }

  export interface SuffixRangeSpec {
    suffixLength: bigint
  }

  export namespace SuffixRangeSpec {
    let _codec: Codec<SuffixRangeSpec>

    export const codec = (): Codec<SuffixRangeSpec> => {
      if (_codec == null) {
        _codec = message<SuffixRangeSpec>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.suffixLength != null && obj.suffixLength !== 0n)) {
            w.uint32(8)
            w.int64(obj.suffixLength)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            suffixLength: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.suffixLength = reader.int64()
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

    export const encode = (obj: Partial<SuffixRangeSpec>): Uint8Array => {
      return encodeMessage(obj, SuffixRangeSpec.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<SuffixRangeSpec>): SuffixRangeSpec => {
      return decodeMessage(buf, SuffixRangeSpec.codec(), opts)
    }
  }

  export interface RangeSpec {
    byteRange?: http.ByteRangeSpec
    suffixRange?: http.SuffixRangeSpec
    otherRange: string
  }

  export namespace RangeSpec {
    let _codec: Codec<RangeSpec>

    export const codec = (): Codec<RangeSpec> => {
      if (_codec == null) {
        _codec = message<RangeSpec>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.byteRange != null) {
            w.uint32(10)
            http.ByteRangeSpec.codec().encode(obj.byteRange, w)
          }

          if (obj.suffixRange != null) {
            w.uint32(18)
            http.SuffixRangeSpec.codec().encode(obj.suffixRange, w)
          }

          if ((obj.otherRange != null && obj.otherRange !== '')) {
            w.uint32(26)
            w.string(obj.otherRange)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            otherRange: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.byteRange = http.ByteRangeSpec.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.byteRange
                })
                break
              }
              case 2: {
                obj.suffixRange = http.SuffixRangeSpec.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.suffixRange
                })
                break
              }
              case 3: {
                obj.otherRange = reader.string()
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

    export const encode = (obj: Partial<RangeSpec>): Uint8Array => {
      return encodeMessage(obj, RangeSpec.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RangeSpec>): RangeSpec => {
      return decodeMessage(buf, RangeSpec.codec(), opts)
    }
  }

  export interface RangeRequest {
    rangeUnit: string
    ranges: http.RangeSpec[]
    etag: string
    httpDate: string
  }

  export namespace RangeRequest {
    let _codec: Codec<RangeRequest>

    export const codec = (): Codec<RangeRequest> => {
      if (_codec == null) {
        _codec = message<RangeRequest>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.rangeUnit != null && obj.rangeUnit !== '')) {
            w.uint32(10)
            w.string(obj.rangeUnit)
          }

          if (obj.ranges != null) {
            for (const value of obj.ranges) {
              w.uint32(18)
              http.RangeSpec.codec().encode(value, w)
            }
          }

          if ((obj.etag != null && obj.etag !== '')) {
            w.uint32(26)
            w.string(obj.etag)
          }

          if ((obj.httpDate != null && obj.httpDate !== '')) {
            w.uint32(34)
            w.string(obj.httpDate)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            rangeUnit: '',
            ranges: [],
            etag: '',
            httpDate: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.rangeUnit = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.ranges != null && obj.ranges.length === opts.limits.ranges) {
                  throw new MaxLengthError('Decode error - map field "ranges" had too many elements')
                }

                obj.ranges.push(http.RangeSpec.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.ranges$
                }))
                break
              }
              case 3: {
                obj.etag = reader.string()
                break
              }
              case 4: {
                obj.httpDate = reader.string()
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

    export const encode = (obj: Partial<RangeRequest>): Uint8Array => {
      return encodeMessage(obj, RangeRequest.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RangeRequest>): RangeRequest => {
      return decodeMessage(buf, RangeRequest.codec(), opts)
    }
  }

  export interface ContentRange {
    unit: string
    firstPos: bigint
    lastPos: bigint
    completeLength: bigint
  }

  export namespace ContentRange {
    let _codec: Codec<ContentRange>

    export const codec = (): Codec<ContentRange> => {
      if (_codec == null) {
        _codec = message<ContentRange>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.unit != null && obj.unit !== '')) {
            w.uint32(10)
            w.string(obj.unit)
          }

          if ((obj.firstPos != null && obj.firstPos !== 0n)) {
            w.uint32(16)
            w.int64(obj.firstPos)
          }

          if ((obj.lastPos != null && obj.lastPos !== 0n)) {
            w.uint32(24)
            w.int64(obj.lastPos)
          }

          if ((obj.completeLength != null && obj.completeLength !== 0n)) {
            w.uint32(32)
            w.int64(obj.completeLength)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            unit: '',
            firstPos: 0n,
            lastPos: 0n,
            completeLength: 0n
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.unit = reader.string()
                break
              }
              case 2: {
                obj.firstPos = reader.int64()
                break
              }
              case 3: {
                obj.lastPos = reader.int64()
                break
              }
              case 4: {
                obj.completeLength = reader.int64()
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

    export const encode = (obj: Partial<ContentRange>): Uint8Array => {
      return encodeMessage(obj, ContentRange.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ContentRange>): ContentRange => {
      return decodeMessage(buf, ContentRange.codec(), opts)
    }
  }

  export interface AcceptRanges {
    rangeUnits: string[]
  }

  export namespace AcceptRanges {
    let _codec: Codec<AcceptRanges>

    export const codec = (): Codec<AcceptRanges> => {
      if (_codec == null) {
        _codec = message<AcceptRanges>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.rangeUnits != null) {
            for (const value of obj.rangeUnits) {
              w.uint32(10)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            rangeUnits: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.rangeUnits != null && obj.rangeUnits.length === opts.limits.rangeUnits) {
                  throw new MaxLengthError('Decode error - map field "rangeUnits" had too many elements')
                }

                obj.rangeUnits.push(reader.string())
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

    export const encode = (obj: Partial<AcceptRanges>): Uint8Array => {
      return encodeMessage(obj, AcceptRanges.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AcceptRanges>): AcceptRanges => {
      return decodeMessage(buf, AcceptRanges.codec(), opts)
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
