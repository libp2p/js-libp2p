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

  export interface ControlData {
    protocolVersion: string
    method: string
    requestTarget: string
    statusCode: number
    reasonPhrase: string
  }

  export namespace ControlData {
    let _codec: Codec<ControlData>

    export const codec = (): Codec<ControlData> => {
      if (_codec == null) {
        _codec = message<ControlData>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.protocolVersion != null && obj.protocolVersion !== '')) {
            w.uint32(10)
            w.string(obj.protocolVersion)
          }

          if ((obj.method != null && obj.method !== '')) {
            w.uint32(18)
            w.string(obj.method)
          }

          if ((obj.requestTarget != null && obj.requestTarget !== '')) {
            w.uint32(26)
            w.string(obj.requestTarget)
          }

          if ((obj.statusCode != null && obj.statusCode !== 0)) {
            w.uint32(32)
            w.int32(obj.statusCode)
          }

          if ((obj.reasonPhrase != null && obj.reasonPhrase !== '')) {
            w.uint32(42)
            w.string(obj.reasonPhrase)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            protocolVersion: '',
            method: '',
            requestTarget: '',
            statusCode: 0,
            reasonPhrase: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.protocolVersion = reader.string()
                break
              }
              case 2: {
                obj.method = reader.string()
                break
              }
              case 3: {
                obj.requestTarget = reader.string()
                break
              }
              case 4: {
                obj.statusCode = reader.int32()
                break
              }
              case 5: {
                obj.reasonPhrase = reader.string()
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

    export const encode = (obj: Partial<ControlData>): Uint8Array => {
      return encodeMessage(obj, ControlData.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ControlData>): ControlData => {
      return decodeMessage(buf, ControlData.codec(), opts)
    }
  }

  export interface HttpMessage {
    controlData?: http.ControlData
    headers: http.Field[]
    content: Uint8Array
    trailers: http.Field[]
  }

  export namespace HttpMessage {
    let _codec: Codec<HttpMessage>

    export const codec = (): Codec<HttpMessage> => {
      if (_codec == null) {
        _codec = message<HttpMessage>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.controlData != null) {
            w.uint32(10)
            http.ControlData.codec().encode(obj.controlData, w)
          }

          if (obj.headers != null) {
            for (const value of obj.headers) {
              w.uint32(18)
              http.Field.codec().encode(value, w)
            }
          }

          if ((obj.content != null && obj.content.byteLength > 0)) {
            w.uint32(26)
            w.bytes(obj.content)
          }

          if (obj.trailers != null) {
            for (const value of obj.trailers) {
              w.uint32(34)
              http.Field.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            headers: [],
            content: uint8ArrayAlloc(0),
            trailers: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.controlData = http.ControlData.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.controlData
                })
                break
              }
              case 2: {
                if (opts.limits?.headers != null && obj.headers.length === opts.limits.headers) {
                  throw new MaxLengthError('Decode error - map field "headers" had too many elements')
                }

                obj.headers.push(http.Field.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.headers$
                }))
                break
              }
              case 3: {
                obj.content = reader.bytes()
                break
              }
              case 4: {
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

    export const encode = (obj: Partial<HttpMessage>): Uint8Array => {
      return encodeMessage(obj, HttpMessage.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HttpMessage>): HttpMessage => {
      return decodeMessage(buf, HttpMessage.codec(), opts)
    }
  }

  export interface HttpRequest {
    baseMessage?: http.HttpMessage
    method: string
    targetUri: string
    protocolVersion: string
  }

  export namespace HttpRequest {
    let _codec: Codec<HttpRequest>

    export const codec = (): Codec<HttpRequest> => {
      if (_codec == null) {
        _codec = message<HttpRequest>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.baseMessage != null) {
            w.uint32(10)
            http.HttpMessage.codec().encode(obj.baseMessage, w)
          }

          if ((obj.method != null && obj.method !== '')) {
            w.uint32(18)
            w.string(obj.method)
          }

          if ((obj.targetUri != null && obj.targetUri !== '')) {
            w.uint32(26)
            w.string(obj.targetUri)
          }

          if ((obj.protocolVersion != null && obj.protocolVersion !== '')) {
            w.uint32(34)
            w.string(obj.protocolVersion)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            method: '',
            targetUri: '',
            protocolVersion: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.baseMessage = http.HttpMessage.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.baseMessage
                })
                break
              }
              case 2: {
                obj.method = reader.string()
                break
              }
              case 3: {
                obj.targetUri = reader.string()
                break
              }
              case 4: {
                obj.protocolVersion = reader.string()
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

    export const encode = (obj: Partial<HttpRequest>): Uint8Array => {
      return encodeMessage(obj, HttpRequest.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HttpRequest>): HttpRequest => {
      return decodeMessage(buf, HttpRequest.codec(), opts)
    }
  }

  export interface HttpResponse {
    content: BodyInit | null | undefined
    status: number | undefined
    headers: any
    baseMessage?: http.HttpMessage
    statusCode: number
    reasonPhrase: string
    protocolVersion: string
  }

  export namespace HttpResponse {
    let _codec: Codec<HttpResponse>

    export const codec = (): Codec<HttpResponse> => {
      if (_codec == null) {
        _codec = message<HttpResponse>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.baseMessage != null) {
            w.uint32(10)
            http.HttpMessage.codec().encode(obj.baseMessage, w)
          }

          if ((obj.statusCode != null && obj.statusCode !== 0)) {
            w.uint32(16)
            w.int32(obj.statusCode)
          }

          if ((obj.reasonPhrase != null && obj.reasonPhrase !== '')) {
            w.uint32(26)
            w.string(obj.reasonPhrase)
          }

          if ((obj.protocolVersion != null && obj.protocolVersion !== '')) {
            w.uint32(34)
            w.string(obj.protocolVersion)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            statusCode: 0,
            reasonPhrase: '',
            protocolVersion: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.baseMessage = http.HttpMessage.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.baseMessage
                })
                break
              }
              case 2: {
                obj.statusCode = reader.int32()
                break
              }
              case 3: {
                obj.reasonPhrase = reader.string()
                break
              }
              case 4: {
                obj.protocolVersion = reader.string()
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

    export const encode = (obj: Partial<HttpResponse>): Uint8Array => {
      return encodeMessage(obj, HttpResponse.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<HttpResponse>): HttpResponse => {
      return decodeMessage(buf, HttpResponse.codec(), opts)
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
