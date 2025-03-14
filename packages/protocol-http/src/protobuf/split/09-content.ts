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

  export interface TransferEncodings {
    encodings: http.TransferCoding[]
    chunked: boolean
  }

  export namespace TransferEncodings {
    let _codec: Codec<TransferEncodings>

    export const codec = (): Codec<TransferEncodings> => {
      if (_codec == null) {
        _codec = message<TransferEncodings>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.encodings != null) {
            for (const value of obj.encodings) {
              w.uint32(10)
              http.TransferCoding.codec().encode(value, w)
            }
          }

          if ((obj.chunked != null && obj.chunked !== false)) {
            w.uint32(16)
            w.bool(obj.chunked)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            encodings: [],
            chunked: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.encodings != null && obj.encodings.length === opts.limits.encodings) {
                  throw new MaxLengthError('Decode error - map field "encodings" had too many elements')
                }

                obj.encodings.push(http.TransferCoding.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.encodings$
                }))
                break
              }
              case 2: {
                obj.chunked = reader.bool()
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

    export const encode = (obj: Partial<TransferEncodings>): Uint8Array => {
      return encodeMessage(obj, TransferEncodings.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<TransferEncodings>): TransferEncodings => {
      return decodeMessage(buf, TransferEncodings.codec(), opts)
    }
  }

  export interface RepresentationMetadata {
    contentType: string
    contentEncoding: string[]
    contentLanguage: string[]
    contentLocation: string
    contentLength: bigint
    etag: string
    lastModified: string
  }

  export namespace RepresentationMetadata {
    let _codec: Codec<RepresentationMetadata>

    export const codec = (): Codec<RepresentationMetadata> => {
      if (_codec == null) {
        _codec = message<RepresentationMetadata>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.contentType != null && obj.contentType !== '')) {
            w.uint32(10)
            w.string(obj.contentType)
          }

          if (obj.contentEncoding != null) {
            for (const value of obj.contentEncoding) {
              w.uint32(18)
              w.string(value)
            }
          }

          if (obj.contentLanguage != null) {
            for (const value of obj.contentLanguage) {
              w.uint32(26)
              w.string(value)
            }
          }

          if ((obj.contentLocation != null && obj.contentLocation !== '')) {
            w.uint32(34)
            w.string(obj.contentLocation)
          }

          if ((obj.contentLength != null && obj.contentLength !== 0n)) {
            w.uint32(40)
            w.int64(obj.contentLength)
          }

          if ((obj.etag != null && obj.etag !== '')) {
            w.uint32(50)
            w.string(obj.etag)
          }

          if ((obj.lastModified != null && obj.lastModified !== '')) {
            w.uint32(58)
            w.string(obj.lastModified)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            contentType: '',
            contentEncoding: [],
            contentLanguage: [],
            contentLocation: '',
            contentLength: 0n,
            etag: '',
            lastModified: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.contentType = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.contentEncoding != null && obj.contentEncoding.length === opts.limits.contentEncoding) {
                  throw new MaxLengthError('Decode error - map field "contentEncoding" had too many elements')
                }

                obj.contentEncoding.push(reader.string())
                break
              }
              case 3: {
                if (opts.limits?.contentLanguage != null && obj.contentLanguage.length === opts.limits.contentLanguage) {
                  throw new MaxLengthError('Decode error - map field "contentLanguage" had too many elements')
                }

                obj.contentLanguage.push(reader.string())
                break
              }
              case 4: {
                obj.contentLocation = reader.string()
                break
              }
              case 5: {
                obj.contentLength = reader.int64()
                break
              }
              case 6: {
                obj.etag = reader.string()
                break
              }
              case 7: {
                obj.lastModified = reader.string()
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

    export const encode = (obj: Partial<RepresentationMetadata>): Uint8Array => {
      return encodeMessage(obj, RepresentationMetadata.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<RepresentationMetadata>): RepresentationMetadata => {
      return decodeMessage(buf, RepresentationMetadata.codec(), opts)
    }
  }

  export interface Content {
    data: Uint8Array
    mediaType: string
    encodings: string[]
    languages: string[]
    location: string
    length: bigint
  }

  export namespace Content {
    let _codec: Codec<Content>

    export const codec = (): Codec<Content> => {
      if (_codec == null) {
        _codec = message<Content>((obj, w, opts = {}) => {
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

          if (obj.encodings != null) {
            for (const value of obj.encodings) {
              w.uint32(26)
              w.string(value)
            }
          }

          if (obj.languages != null) {
            for (const value of obj.languages) {
              w.uint32(34)
              w.string(value)
            }
          }

          if ((obj.location != null && obj.location !== '')) {
            w.uint32(42)
            w.string(obj.location)
          }

          if ((obj.length != null && obj.length !== 0n)) {
            w.uint32(48)
            w.int64(obj.length)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            data: uint8ArrayAlloc(0),
            mediaType: '',
            encodings: [],
            languages: [],
            location: '',
            length: 0n
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
                if (opts.limits?.encodings != null && obj.encodings.length === opts.limits.encodings) {
                  throw new MaxLengthError('Decode error - map field "encodings" had too many elements')
                }

                obj.encodings.push(reader.string())
                break
              }
              case 4: {
                if (opts.limits?.languages != null && obj.languages.length === opts.limits.languages) {
                  throw new MaxLengthError('Decode error - map field "languages" had too many elements')
                }

                obj.languages.push(reader.string())
                break
              }
              case 5: {
                obj.location = reader.string()
                break
              }
              case 6: {
                obj.length = reader.int64()
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

    export const encode = (obj: Partial<Content>): Uint8Array => {
      return encodeMessage(obj, Content.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Content>): Content => {
      return decodeMessage(buf, Content.codec(), opts)
    }
  }

  export interface BinaryContent {
    data: Uint8Array
    source: http.BinaryContent.ContentSource
    sourceReference: string
    offset: bigint
    length: bigint
  }

  export namespace BinaryContent {
    export enum ContentSource {
      UNKNOWN = 'UNKNOWN',
      LITERAL = 'LITERAL',
      FILE = 'FILE',
      STREAM = 'STREAM'
    }

    enum __ContentSourceValues {
      UNKNOWN = 0,
      LITERAL = 1,
      FILE = 2,
      STREAM = 3
    }

    export namespace ContentSource {
      export const codec = (): Codec<ContentSource> => {
        return enumeration<ContentSource>(__ContentSourceValues)
      }
    }

    let _codec: Codec<BinaryContent>

    export const codec = (): Codec<BinaryContent> => {
      if (_codec == null) {
        _codec = message<BinaryContent>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.data != null && obj.data.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.data)
          }

          if (obj.source != null && __ContentSourceValues[obj.source] !== 0) {
            w.uint32(16)
            http.BinaryContent.ContentSource.codec().encode(obj.source, w)
          }

          if ((obj.sourceReference != null && obj.sourceReference !== '')) {
            w.uint32(26)
            w.string(obj.sourceReference)
          }

          if ((obj.offset != null && obj.offset !== 0n)) {
            w.uint32(32)
            w.int64(obj.offset)
          }

          if ((obj.length != null && obj.length !== 0n)) {
            w.uint32(40)
            w.int64(obj.length)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            data: uint8ArrayAlloc(0),
            source: ContentSource.UNKNOWN,
            sourceReference: '',
            offset: 0n,
            length: 0n
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
                obj.source = http.BinaryContent.ContentSource.codec().decode(reader)
                break
              }
              case 3: {
                obj.sourceReference = reader.string()
                break
              }
              case 4: {
                obj.offset = reader.int64()
                break
              }
              case 5: {
                obj.length = reader.int64()
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

    export const encode = (obj: Partial<BinaryContent>): Uint8Array => {
      return encodeMessage(obj, BinaryContent.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<BinaryContent>): BinaryContent => {
      return decodeMessage(buf, BinaryContent.codec(), opts)
    }
  }

  export interface MessageFraming {
    contentLength: bigint
    transferEncoding?: http.TransferEncodings
    connectionClose: boolean
    isComplete: boolean
  }

  export namespace MessageFraming {
    let _codec: Codec<MessageFraming>

    export const codec = (): Codec<MessageFraming> => {
      if (_codec == null) {
        _codec = message<MessageFraming>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.contentLength != null && obj.contentLength !== 0n)) {
            w.uint32(8)
            w.int64(obj.contentLength)
          }

          if (obj.transferEncoding != null) {
            w.uint32(18)
            http.TransferEncodings.codec().encode(obj.transferEncoding, w)
          }

          if ((obj.connectionClose != null && obj.connectionClose !== false)) {
            w.uint32(24)
            w.bool(obj.connectionClose)
          }

          if ((obj.isComplete != null && obj.isComplete !== false)) {
            w.uint32(32)
            w.bool(obj.isComplete)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            contentLength: 0n,
            connectionClose: false,
            isComplete: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.contentLength = reader.int64()
                break
              }
              case 2: {
                obj.transferEncoding = http.TransferEncodings.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.transferEncoding
                })
                break
              }
              case 3: {
                obj.connectionClose = reader.bool()
                break
              }
              case 4: {
                obj.isComplete = reader.bool()
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

    export const encode = (obj: Partial<MessageFraming>): Uint8Array => {
      return encodeMessage(obj, MessageFraming.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<MessageFraming>): MessageFraming => {
      return decodeMessage(buf, MessageFraming.codec(), opts)
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
