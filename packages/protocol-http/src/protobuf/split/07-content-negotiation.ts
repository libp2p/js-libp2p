/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface MediaTypeParameter {
    name: string
    value: string
  }

  export namespace MediaTypeParameter {
    let _codec: Codec<MediaTypeParameter>

    export const codec = (): Codec<MediaTypeParameter> => {
      if (_codec == null) {
        _codec = message<MediaTypeParameter>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<MediaTypeParameter>): Uint8Array => {
      return encodeMessage(obj, MediaTypeParameter.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MediaTypeParameter>): MediaTypeParameter => {
      return decodeMessage(buf, MediaTypeParameter.codec(), opts)
    }
  }

  export interface MediaRangeWithQValue {
    type: string
    subtype: string
    parameters: http.MediaTypeParameter[]
    qvalue: number
  }

  export namespace MediaRangeWithQValue {
    let _codec: Codec<MediaRangeWithQValue>

    export const codec = (): Codec<MediaRangeWithQValue> => {
      if (_codec == null) {
        _codec = message<MediaRangeWithQValue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.type != null && obj.type !== '')) {
            w.uint32(10)
            w.string(obj.type)
          }

          if ((obj.subtype != null && obj.subtype !== '')) {
            w.uint32(18)
            w.string(obj.subtype)
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(26)
              http.MediaTypeParameter.codec().encode(value, w)
            }
          }

          if ((obj.qvalue != null && obj.qvalue !== 0)) {
            w.uint32(37)
            w.float(obj.qvalue)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            type: '',
            subtype: '',
            parameters: [],
            qvalue: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.type = reader.string()
                break
              }
              case 2: {
                obj.subtype = reader.string()
                break
              }
              case 3: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.MediaTypeParameter.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parameters$
                }))
                break
              }
              case 4: {
                obj.qvalue = reader.float()
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

    export const encode = (obj: Partial<MediaRangeWithQValue>): Uint8Array => {
      return encodeMessage(obj, MediaRangeWithQValue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MediaRangeWithQValue>): MediaRangeWithQValue => {
      return decodeMessage(buf, MediaRangeWithQValue.codec(), opts)
    }
  }

  export interface LanguageRangeWithQValue {
    languageRange: string
    qvalue: number
  }

  export namespace LanguageRangeWithQValue {
    let _codec: Codec<LanguageRangeWithQValue>

    export const codec = (): Codec<LanguageRangeWithQValue> => {
      if (_codec == null) {
        _codec = message<LanguageRangeWithQValue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.languageRange != null && obj.languageRange !== '')) {
            w.uint32(10)
            w.string(obj.languageRange)
          }

          if ((obj.qvalue != null && obj.qvalue !== 0)) {
            w.uint32(21)
            w.float(obj.qvalue)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            languageRange: '',
            qvalue: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.languageRange = reader.string()
                break
              }
              case 2: {
                obj.qvalue = reader.float()
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

    export const encode = (obj: Partial<LanguageRangeWithQValue>): Uint8Array => {
      return encodeMessage(obj, LanguageRangeWithQValue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<LanguageRangeWithQValue>): LanguageRangeWithQValue => {
      return decodeMessage(buf, LanguageRangeWithQValue.codec(), opts)
    }
  }

  export interface CodingWithQValue {
    coding: string
    qvalue: number
  }

  export namespace CodingWithQValue {
    let _codec: Codec<CodingWithQValue>

    export const codec = (): Codec<CodingWithQValue> => {
      if (_codec == null) {
        _codec = message<CodingWithQValue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.coding != null && obj.coding !== '')) {
            w.uint32(10)
            w.string(obj.coding)
          }

          if ((obj.qvalue != null && obj.qvalue !== 0)) {
            w.uint32(21)
            w.float(obj.qvalue)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            coding: '',
            qvalue: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.coding = reader.string()
                break
              }
              case 2: {
                obj.qvalue = reader.float()
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

    export const encode = (obj: Partial<CodingWithQValue>): Uint8Array => {
      return encodeMessage(obj, CodingWithQValue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CodingWithQValue>): CodingWithQValue => {
      return decodeMessage(buf, CodingWithQValue.codec(), opts)
    }
  }

  export interface CharsetWithQValue {
    charset: string
    qvalue: number
  }

  export namespace CharsetWithQValue {
    let _codec: Codec<CharsetWithQValue>

    export const codec = (): Codec<CharsetWithQValue> => {
      if (_codec == null) {
        _codec = message<CharsetWithQValue>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.charset != null && obj.charset !== '')) {
            w.uint32(10)
            w.string(obj.charset)
          }

          if ((obj.qvalue != null && obj.qvalue !== 0)) {
            w.uint32(21)
            w.float(obj.qvalue)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            charset: '',
            qvalue: 0
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.charset = reader.string()
                break
              }
              case 2: {
                obj.qvalue = reader.float()
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

    export const encode = (obj: Partial<CharsetWithQValue>): Uint8Array => {
      return encodeMessage(obj, CharsetWithQValue.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<CharsetWithQValue>): CharsetWithQValue => {
      return decodeMessage(buf, CharsetWithQValue.codec(), opts)
    }
  }

  export interface ContentNegotiation {
    accept: http.MediaRangeWithQValue[]
    acceptLanguage: http.LanguageRangeWithQValue[]
    acceptEncoding: http.CodingWithQValue[]
    acceptCharset: http.CharsetWithQValue[]
    vary: string[]
  }

  export namespace ContentNegotiation {
    let _codec: Codec<ContentNegotiation>

    export const codec = (): Codec<ContentNegotiation> => {
      if (_codec == null) {
        _codec = message<ContentNegotiation>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.accept != null) {
            for (const value of obj.accept) {
              w.uint32(10)
              http.MediaRangeWithQValue.codec().encode(value, w)
            }
          }

          if (obj.acceptLanguage != null) {
            for (const value of obj.acceptLanguage) {
              w.uint32(18)
              http.LanguageRangeWithQValue.codec().encode(value, w)
            }
          }

          if (obj.acceptEncoding != null) {
            for (const value of obj.acceptEncoding) {
              w.uint32(26)
              http.CodingWithQValue.codec().encode(value, w)
            }
          }

          if (obj.acceptCharset != null) {
            for (const value of obj.acceptCharset) {
              w.uint32(34)
              http.CharsetWithQValue.codec().encode(value, w)
            }
          }

          if (obj.vary != null) {
            for (const value of obj.vary) {
              w.uint32(42)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            accept: [],
            acceptLanguage: [],
            acceptEncoding: [],
            acceptCharset: [],
            vary: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.accept != null && obj.accept.length === opts.limits.accept) {
                  throw new MaxLengthError('Decode error - map field "accept" had too many elements')
                }

                obj.accept.push(http.MediaRangeWithQValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.accept$
                }))
                break
              }
              case 2: {
                if (opts.limits?.acceptLanguage != null && obj.acceptLanguage.length === opts.limits.acceptLanguage) {
                  throw new MaxLengthError('Decode error - map field "acceptLanguage" had too many elements')
                }

                obj.acceptLanguage.push(http.LanguageRangeWithQValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.acceptLanguage$
                }))
                break
              }
              case 3: {
                if (opts.limits?.acceptEncoding != null && obj.acceptEncoding.length === opts.limits.acceptEncoding) {
                  throw new MaxLengthError('Decode error - map field "acceptEncoding" had too many elements')
                }

                obj.acceptEncoding.push(http.CodingWithQValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.acceptEncoding$
                }))
                break
              }
              case 4: {
                if (opts.limits?.acceptCharset != null && obj.acceptCharset.length === opts.limits.acceptCharset) {
                  throw new MaxLengthError('Decode error - map field "acceptCharset" had too many elements')
                }

                obj.acceptCharset.push(http.CharsetWithQValue.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.acceptCharset$
                }))
                break
              }
              case 5: {
                if (opts.limits?.vary != null && obj.vary.length === opts.limits.vary) {
                  throw new MaxLengthError('Decode error - map field "vary" had too many elements')
                }

                obj.vary.push(reader.string())
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

    export const encode = (obj: Partial<ContentNegotiation>): Uint8Array => {
      return encodeMessage(obj, ContentNegotiation.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ContentNegotiation>): ContentNegotiation => {
      return decodeMessage(buf, ContentNegotiation.codec(), opts)
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
