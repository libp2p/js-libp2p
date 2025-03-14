/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { type Codec, decodeMessage, type DecodeOptions, encodeMessage, MaxLengthError, message } from 'protons-runtime'
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

  export interface Chunk {
    size: number
    data: Uint8Array
    chunkExtensions: http.Field[]
  }

  export namespace Chunk {
    let _codec: Codec<Chunk>

    export const codec = (): Codec<Chunk> => {
      if (_codec == null) {
        _codec = message<Chunk>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.size != null && obj.size !== 0)) {
            w.uint32(8)
            w.uint32(obj.size)
          }

          if ((obj.data != null && obj.data.byteLength > 0)) {
            w.uint32(18)
            w.bytes(obj.data)
          }

          if (obj.chunkExtensions != null) {
            for (const value of obj.chunkExtensions) {
              w.uint32(26)
              http.Field.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            size: 0,
            data: uint8ArrayAlloc(0),
            chunkExtensions: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.size = reader.uint32()
                break
              }
              case 2: {
                obj.data = reader.bytes()
                break
              }
              case 3: {
                if (opts.limits?.chunkExtensions != null && obj.chunkExtensions.length === opts.limits.chunkExtensions) {
                  throw new MaxLengthError('Decode error - map field "chunkExtensions" had too many elements')
                }

                obj.chunkExtensions.push(http.Field.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.chunkExtensions$
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

    export const encode = (obj: Partial<Chunk>): Uint8Array => {
      return encodeMessage(obj, Chunk.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Chunk>): Chunk => {
      return decodeMessage(buf, Chunk.codec(), opts)
    }
  }

  export interface ChunkedData {
    chunks: http.Chunk[]
    trailers: http.Field[]
  }

  export namespace ChunkedData {
    let _codec: Codec<ChunkedData>

    export const codec = (): Codec<ChunkedData> => {
      if (_codec == null) {
        _codec = message<ChunkedData>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.chunks != null) {
            for (const value of obj.chunks) {
              w.uint32(10)
              http.Chunk.codec().encode(value, w)
            }
          }

          if (obj.trailers != null) {
            for (const value of obj.trailers) {
              w.uint32(18)
              http.Field.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            chunks: [],
            trailers: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.chunks != null && obj.chunks.length === opts.limits.chunks) {
                  throw new MaxLengthError('Decode error - map field "chunks" had too many elements')
                }

                obj.chunks.push(http.Chunk.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.chunks$
                }))
                break
              }
              case 2: {
                if (opts.limits?.trailers != null && obj.trailers.length === opts.limits.trailers) {
                  throw new MaxLengthError('Decode error - map field "trailers" had too many elements')
                }

                obj.trailers.push(http.Field.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.trailers$
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

    export const encode = (obj: Partial<ChunkedData>): Uint8Array => {
      return encodeMessage(obj, ChunkedData.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ChunkedData>): ChunkedData => {
      return decodeMessage(buf, ChunkedData.codec(), opts)
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
