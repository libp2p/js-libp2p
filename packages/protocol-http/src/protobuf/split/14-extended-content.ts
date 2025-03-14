/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface http {}

export namespace http {
  export interface Field {
    name: string
    value: string
  }

  export namespace Field {
    let _codec: Codec<Field>

    export const codec = (): Codec<Field> => {
      if (_codec == null) {
        _codec = message<Field>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<Field>): Uint8Array => {
      return encodeMessage(obj, Field.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Field>): Field => {
      return decodeMessage(buf, Field.codec(), opts)
    }
  }

  export interface TransferCodingParameter {
    name: string
    value: string
  }

  export namespace TransferCodingParameter {
    let _codec: Codec<TransferCodingParameter>

    export const codec = (): Codec<TransferCodingParameter> => {
      if (_codec == null) {
        _codec = message<TransferCodingParameter>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<TransferCodingParameter>): Uint8Array => {
      return encodeMessage(obj, TransferCodingParameter.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransferCodingParameter>): TransferCodingParameter => {
      return decodeMessage(buf, TransferCodingParameter.codec(), opts)
    }
  }

  export interface TransferCoding {
    coding: string
    parameters: http.TransferCodingParameter[]
  }

  export namespace TransferCoding {
    let _codec: Codec<TransferCoding>

    export const codec = (): Codec<TransferCoding> => {
      if (_codec == null) {
        _codec = message<TransferCoding>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.coding != null && obj.coding !== '')) {
            w.uint32(10)
            w.string(obj.coding)
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(18)
              http.TransferCodingParameter.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            coding: '',
            parameters: []
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
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.TransferCodingParameter.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parameters$
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

    export const encode = (obj: Partial<TransferCoding>): Uint8Array => {
      return encodeMessage(obj, TransferCoding.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransferCoding>): TransferCoding => {
      return decodeMessage(buf, TransferCoding.codec(), opts)
    }
  }

  export interface MultipartContent {
    boundary: string
    parts: http.BodyPart[]
  }

  export namespace MultipartContent {
    let _codec: Codec<MultipartContent>

    export const codec = (): Codec<MultipartContent> => {
      if (_codec == null) {
        _codec = message<MultipartContent>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.boundary != null && obj.boundary !== '')) {
            w.uint32(10)
            w.string(obj.boundary)
          }

          if (obj.parts != null) {
            for (const value of obj.parts) {
              w.uint32(18)
              http.BodyPart.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            boundary: '',
            parts: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.boundary = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.parts != null && obj.parts.length === opts.limits.parts) {
                  throw new MaxLengthError('Decode error - map field "parts" had too many elements')
                }

                obj.parts.push(http.BodyPart.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parts$
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

    export const encode = (obj: Partial<MultipartContent>): Uint8Array => {
      return encodeMessage(obj, MultipartContent.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MultipartContent>): MultipartContent => {
      return decodeMessage(buf, MultipartContent.codec(), opts)
    }
  }

  export interface BodyPart {
    headers: http.Field[]
    content: Uint8Array
  }

  export namespace BodyPart {
    let _codec: Codec<BodyPart>

    export const codec = (): Codec<BodyPart> => {
      if (_codec == null) {
        _codec = message<BodyPart>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.headers != null) {
            for (const value of obj.headers) {
              w.uint32(10)
              http.Field.codec().encode(value, w)
            }
          }

          if ((obj.content != null && obj.content.byteLength > 0)) {
            w.uint32(18)
            w.bytes(obj.content)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            headers: [],
            content: uint8ArrayAlloc(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.headers != null && obj.headers.length === opts.limits.headers) {
                  throw new MaxLengthError('Decode error - map field "headers" had too many elements')
                }

                obj.headers.push(http.Field.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.headers$
                }))
                break
              }
              case 2: {
                obj.content = reader.bytes()
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

    export const encode = (obj: Partial<BodyPart>): Uint8Array => {
      return encodeMessage(obj, BodyPart.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<BodyPart>): BodyPart => {
      return decodeMessage(buf, BodyPart.codec(), opts)
    }
  }

  export interface ByteRange {
    firstPos: bigint
    lastPos: bigint
    content: Uint8Array
    contentType: string
  }

  export namespace ByteRange {
    let _codec: Codec<ByteRange>

    export const codec = (): Codec<ByteRange> => {
      if (_codec == null) {
        _codec = message<ByteRange>((obj, w, opts = {}) => {
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

          if ((obj.content != null && obj.content.byteLength > 0)) {
            w.uint32(26)
            w.bytes(obj.content)
          }

          if ((obj.contentType != null && obj.contentType !== '')) {
            w.uint32(34)
            w.string(obj.contentType)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            firstPos: 0n,
            lastPos: 0n,
            content: uint8ArrayAlloc(0),
            contentType: ''
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
              case 3: {
                obj.content = reader.bytes()
                break
              }
              case 4: {
                obj.contentType = reader.string()
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

    export const encode = (obj: Partial<ByteRange>): Uint8Array => {
      return encodeMessage(obj, ByteRange.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ByteRange>): ByteRange => {
      return decodeMessage(buf, ByteRange.codec(), opts)
    }
  }

  export interface ByteRangeContent {
    ranges: http.ByteRange[]
    completeLength: bigint
    multipart: boolean
  }

  export namespace ByteRangeContent {
    let _codec: Codec<ByteRangeContent>

    export const codec = (): Codec<ByteRangeContent> => {
      if (_codec == null) {
        _codec = message<ByteRangeContent>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.ranges != null) {
            for (const value of obj.ranges) {
              w.uint32(10)
              http.ByteRange.codec().encode(value, w)
            }
          }

          if ((obj.completeLength != null && obj.completeLength !== 0n)) {
            w.uint32(16)
            w.int64(obj.completeLength)
          }

          if ((obj.multipart != null && obj.multipart !== false)) {
            w.uint32(24)
            w.bool(obj.multipart)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            ranges: [],
            completeLength: 0n,
            multipart: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.ranges != null && obj.ranges.length === opts.limits.ranges) {
                  throw new MaxLengthError('Decode error - map field "ranges" had too many elements')
                }

                obj.ranges.push(http.ByteRange.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.ranges$
                }))
                break
              }
              case 2: {
                obj.completeLength = reader.int64()
                break
              }
              case 3: {
                obj.multipart = reader.bool()
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

    export const encode = (obj: Partial<ByteRangeContent>): Uint8Array => {
      return encodeMessage(obj, ByteRangeContent.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ByteRangeContent>): ByteRangeContent => {
      return decodeMessage(buf, ByteRangeContent.codec(), opts)
    }
  }

  export interface ContentTypeParameter {
    name: string
    value: string
  }

  export namespace ContentTypeParameter {
    let _codec: Codec<ContentTypeParameter>

    export const codec = (): Codec<ContentTypeParameter> => {
      if (_codec == null) {
        _codec = message<ContentTypeParameter>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<ContentTypeParameter>): Uint8Array => {
      return encodeMessage(obj, ContentTypeParameter.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ContentTypeParameter>): ContentTypeParameter => {
      return decodeMessage(buf, ContentTypeParameter.codec(), opts)
    }
  }

  export interface ExtendedContent {
    data: Uint8Array
    mediaType: string
    parameters: http.ContentTypeParameter[]
    contentEncodings: string[]
    transferEncodings: http.TransferCoding[]
    multipart?: http.MultipartContent
    byteRanges?: http.ByteRangeContent
  }

  export namespace ExtendedContent {
    let _codec: Codec<ExtendedContent>

    export const codec = (): Codec<ExtendedContent> => {
      if (_codec == null) {
        _codec = message<ExtendedContent>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.data != null && obj.data.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.data)
          }

          if ((obj.mediaType != null && obj.mediaType !== '')) {
            w.uint32(18)
            w.string(obj.mediaType)
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(26)
              http.ContentTypeParameter.codec().encode(value, w)
            }
          }

          if (obj.contentEncodings != null) {
            for (const value of obj.contentEncodings) {
              w.uint32(34)
              w.string(value)
            }
          }

          if (obj.transferEncodings != null) {
            for (const value of obj.transferEncodings) {
              w.uint32(42)
              http.TransferCoding.codec().encode(value, w)
            }
          }

          if (obj.multipart != null) {
            w.uint32(50)
            http.MultipartContent.codec().encode(obj.multipart, w)
          }

          if (obj.byteRanges != null) {
            w.uint32(58)
            http.ByteRangeContent.codec().encode(obj.byteRanges, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            data: uint8ArrayAlloc(0),
            mediaType: '',
            parameters: [],
            contentEncodings: [],
            transferEncodings: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.data = reader.bytes()
                break
              }
              case 2: {
                obj.mediaType = reader.string()
                break
              }
              case 3: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.ContentTypeParameter.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parameters$
                }))
                break
              }
              case 4: {
                if (opts.limits?.contentEncodings != null && obj.contentEncodings.length === opts.limits.contentEncodings) {
                  throw new MaxLengthError('Decode error - map field "contentEncodings" had too many elements')
                }

                obj.contentEncodings.push(reader.string())
                break
              }
              case 5: {
                if (opts.limits?.transferEncodings != null && obj.transferEncodings.length === opts.limits.transferEncodings) {
                  throw new MaxLengthError('Decode error - map field "transferEncodings" had too many elements')
                }

                obj.transferEncodings.push(http.TransferCoding.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.transferEncodings$
                }))
                break
              }
              case 6: {
                obj.multipart = http.MultipartContent.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.multipart
                })
                break
              }
              case 7: {
                obj.byteRanges = http.ByteRangeContent.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.byteRanges
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

    export const encode = (obj: Partial<ExtendedContent>): Uint8Array => {
      return encodeMessage(obj, ExtendedContent.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ExtendedContent>): ExtendedContent => {
      return decodeMessage(buf, ExtendedContent.codec(), opts)
    }
  }

  export interface TransformationParameter {
    name: string
    value: string
  }

  export namespace TransformationParameter {
    let _codec: Codec<TransformationParameter>

    export const codec = (): Codec<TransformationParameter> => {
      if (_codec == null) {
        _codec = message<TransformationParameter>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<TransformationParameter>): Uint8Array => {
      return encodeMessage(obj, TransformationParameter.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransformationParameter>): TransformationParameter => {
      return decodeMessage(buf, TransformationParameter.codec(), opts)
    }
  }

  export interface ContentTransformation {
    type: http.ContentTransformation.TransformationType
    sourceFormat: string
    targetFormat: string
    parameters: http.TransformationParameter[]
    reversible: boolean
  }

  export namespace ContentTransformation {
    export enum TransformationType {
      IDENTITY = 'IDENTITY',
      COMPRESSION = 'COMPRESSION',
      CHARACTER_ENCODING = 'CHARACTER_ENCODING',
      FORMAT_CONVERSION = 'FORMAT_CONVERSION'
    }

    enum __TransformationTypeValues {
      IDENTITY = 0,
      COMPRESSION = 1,
      CHARACTER_ENCODING = 2,
      FORMAT_CONVERSION = 3
    }

    export namespace TransformationType {
      export const codec = (): Codec<TransformationType> => {
        return enumeration<TransformationType>(__TransformationTypeValues)
      }
    }

    let _codec: Codec<ContentTransformation>

    export const codec = (): Codec<ContentTransformation> => {
      if (_codec == null) {
        _codec = message<ContentTransformation>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.type != null && __TransformationTypeValues[obj.type] !== 0) {
            w.uint32(8)
            http.ContentTransformation.TransformationType.codec().encode(obj.type, w)
          }

          if ((obj.sourceFormat != null && obj.sourceFormat !== '')) {
            w.uint32(18)
            w.string(obj.sourceFormat)
          }

          if ((obj.targetFormat != null && obj.targetFormat !== '')) {
            w.uint32(26)
            w.string(obj.targetFormat)
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(34)
              http.TransformationParameter.codec().encode(value, w)
            }
          }

          if ((obj.reversible != null && obj.reversible !== false)) {
            w.uint32(40)
            w.bool(obj.reversible)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            type: TransformationType.IDENTITY,
            sourceFormat: '',
            targetFormat: '',
            parameters: [],
            reversible: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.type = http.ContentTransformation.TransformationType.codec().decode(reader)
                break
              }
              case 2: {
                obj.sourceFormat = reader.string()
                break
              }
              case 3: {
                obj.targetFormat = reader.string()
                break
              }
              case 4: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.TransformationParameter.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parameters$
                }))
                break
              }
              case 5: {
                obj.reversible = reader.bool()
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

    export const encode = (obj: Partial<ContentTransformation>): Uint8Array => {
      return encodeMessage(obj, ContentTransformation.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ContentTransformation>): ContentTransformation => {
      return decodeMessage(buf, ContentTransformation.codec(), opts)
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
