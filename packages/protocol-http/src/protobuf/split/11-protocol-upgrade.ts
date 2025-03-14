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
  export interface ProtocolParameter {
    name: string
    value: string
  }

  export namespace ProtocolParameter {
    let _codec: Codec<ProtocolParameter>

    export const codec = (): Codec<ProtocolParameter> => {
      if (_codec == null) {
        _codec = message<ProtocolParameter>((obj, w, opts = {}) => {
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

    export const encode = (obj: Partial<ProtocolParameter>): Uint8Array => {
      return encodeMessage(obj, ProtocolParameter.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProtocolParameter>): ProtocolParameter => {
      return decodeMessage(buf, ProtocolParameter.codec(), opts)
    }
  }

  export interface ProtocolUpgrade {
    protocols: string[]
    parameters: http.ProtocolParameter[]
    connectionUpgrade: boolean
  }

  export namespace ProtocolUpgrade {
    let _codec: Codec<ProtocolUpgrade>

    export const codec = (): Codec<ProtocolUpgrade> => {
      if (_codec == null) {
        _codec = message<ProtocolUpgrade>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.protocols != null) {
            for (const value of obj.protocols) {
              w.uint32(10)
              w.string(value)
            }
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(18)
              http.ProtocolParameter.codec().encode(value, w)
            }
          }

          if ((obj.connectionUpgrade != null && obj.connectionUpgrade !== false)) {
            w.uint32(24)
            w.bool(obj.connectionUpgrade)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            protocols: [],
            parameters: [],
            connectionUpgrade: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                  throw new MaxLengthError('Decode error - map field "protocols" had too many elements')
                }

                obj.protocols.push(reader.string())
                break
              }
              case 2: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.ProtocolParameter.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.parameters$
                }))
                break
              }
              case 3: {
                obj.connectionUpgrade = reader.bool()
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

    export const encode = (obj: Partial<ProtocolUpgrade>): Uint8Array => {
      return encodeMessage(obj, ProtocolUpgrade.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ProtocolUpgrade>): ProtocolUpgrade => {
      return decodeMessage(buf, ProtocolUpgrade.codec(), opts)
    }
  }

  export interface WebSocketUpgrade {
    key: string
    protocols: string[]
    extensions: string[]
    version: string
  }

  export namespace WebSocketUpgrade {
    let _codec: Codec<WebSocketUpgrade>

    export const codec = (): Codec<WebSocketUpgrade> => {
      if (_codec == null) {
        _codec = message<WebSocketUpgrade>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.key != null && obj.key !== '')) {
            w.uint32(10)
            w.string(obj.key)
          }

          if (obj.protocols != null) {
            for (const value of obj.protocols) {
              w.uint32(18)
              w.string(value)
            }
          }

          if (obj.extensions != null) {
            for (const value of obj.extensions) {
              w.uint32(26)
              w.string(value)
            }
          }

          if ((obj.version != null && obj.version !== '')) {
            w.uint32(34)
            w.string(obj.version)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            key: '',
            protocols: [],
            extensions: [],
            version: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.key = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                  throw new MaxLengthError('Decode error - map field "protocols" had too many elements')
                }

                obj.protocols.push(reader.string())
                break
              }
              case 3: {
                if (opts.limits?.extensions != null && obj.extensions.length === opts.limits.extensions) {
                  throw new MaxLengthError('Decode error - map field "extensions" had too many elements')
                }

                obj.extensions.push(reader.string())
                break
              }
              case 4: {
                obj.version = reader.string()
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

    export const encode = (obj: Partial<WebSocketUpgrade>): Uint8Array => {
      return encodeMessage(obj, WebSocketUpgrade.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebSocketUpgrade>): WebSocketUpgrade => {
      return decodeMessage(buf, WebSocketUpgrade.codec(), opts)
    }
  }

  export interface WebSocketResponse {
    accept: string
    protocol: string
    extensions: string[]
  }

  export namespace WebSocketResponse {
    let _codec: Codec<WebSocketResponse>

    export const codec = (): Codec<WebSocketResponse> => {
      if (_codec == null) {
        _codec = message<WebSocketResponse>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.accept != null && obj.accept !== '')) {
            w.uint32(10)
            w.string(obj.accept)
          }

          if ((obj.protocol != null && obj.protocol !== '')) {
            w.uint32(18)
            w.string(obj.protocol)
          }

          if (obj.extensions != null) {
            for (const value of obj.extensions) {
              w.uint32(26)
              w.string(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            accept: '',
            protocol: '',
            extensions: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.accept = reader.string()
                break
              }
              case 2: {
                obj.protocol = reader.string()
                break
              }
              case 3: {
                if (opts.limits?.extensions != null && obj.extensions.length === opts.limits.extensions) {
                  throw new MaxLengthError('Decode error - map field "extensions" had too many elements')
                }

                obj.extensions.push(reader.string())
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

    export const encode = (obj: Partial<WebSocketResponse>): Uint8Array => {
      return encodeMessage(obj, WebSocketResponse.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebSocketResponse>): WebSocketResponse => {
      return decodeMessage(buf, WebSocketResponse.codec(), opts)
    }
  }

  export interface WebTransportUpgrade {
    path: string
    protocols: string[]
    parameters: http.ProtocolParameter[]
  }

  export namespace WebTransportUpgrade {
    let _codec: Codec<WebTransportUpgrade>

    export const codec = (): Codec<WebTransportUpgrade> => {
      if (_codec == null) {
        _codec = message<WebTransportUpgrade>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.path != null && obj.path !== '')) {
            w.uint32(10)
            w.string(obj.path)
          }

          if (obj.protocols != null) {
            for (const value of obj.protocols) {
              w.uint32(18)
              w.string(value)
            }
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(26)
              http.ProtocolParameter.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            path: '',
            protocols: [],
            parameters: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.path = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                  throw new MaxLengthError('Decode error - map field "protocols" had too many elements')
                }

                obj.protocols.push(reader.string())
                break
              }
              case 3: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.ProtocolParameter.codec().decode(reader, reader.uint32(), {
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

    export const encode = (obj: Partial<WebTransportUpgrade>): Uint8Array => {
      return encodeMessage(obj, WebTransportUpgrade.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebTransportUpgrade>): WebTransportUpgrade => {
      return decodeMessage(buf, WebTransportUpgrade.codec(), opts)
    }
  }

  export interface OtherProtocolParameters {
    parameters: http.ProtocolParameter[]
  }

  export namespace OtherProtocolParameters {
    let _codec: Codec<OtherProtocolParameters>

    export const codec = (): Codec<OtherProtocolParameters> => {
      if (_codec == null) {
        _codec = message<OtherProtocolParameters>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.parameters != null) {
            for (const value of obj.parameters) {
              w.uint32(10)
              http.ProtocolParameter.codec().encode(value, w)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            parameters: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                if (opts.limits?.parameters != null && obj.parameters.length === opts.limits.parameters) {
                  throw new MaxLengthError('Decode error - map field "parameters" had too many elements')
                }

                obj.parameters.push(http.ProtocolParameter.codec().decode(reader, reader.uint32(), {
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

    export const encode = (obj: Partial<OtherProtocolParameters>): Uint8Array => {
      return encodeMessage(obj, OtherProtocolParameters.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<OtherProtocolParameters>): OtherProtocolParameters => {
      return decodeMessage(buf, OtherProtocolParameters.codec(), opts)
    }
  }

  export interface UpgradeResponse {
    statusCode: number
    protocol: string
    websocket?: http.WebSocketResponse
    otherParameters?: http.OtherProtocolParameters
  }

  export namespace UpgradeResponse {
    let _codec: Codec<UpgradeResponse>

    export const codec = (): Codec<UpgradeResponse> => {
      if (_codec == null) {
        _codec = message<UpgradeResponse>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.statusCode != null && obj.statusCode !== 0)) {
            w.uint32(8)
            w.int32(obj.statusCode)
          }

          if ((obj.protocol != null && obj.protocol !== '')) {
            w.uint32(18)
            w.string(obj.protocol)
          }

          if (obj.websocket != null) {
            w.uint32(26)
            http.WebSocketResponse.codec().encode(obj.websocket, w)
          }

          if (obj.otherParameters != null) {
            w.uint32(34)
            http.OtherProtocolParameters.codec().encode(obj.otherParameters, w)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            statusCode: 0,
            protocol: ''
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.statusCode = reader.int32()
                break
              }
              case 2: {
                obj.protocol = reader.string()
                break
              }
              case 3: {
                obj.websocket = http.WebSocketResponse.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.websocket
                })
                break
              }
              case 4: {
                obj.otherParameters = http.OtherProtocolParameters.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.otherParameters
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

    export const encode = (obj: Partial<UpgradeResponse>): Uint8Array => {
      return encodeMessage(obj, UpgradeResponse.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<UpgradeResponse>): UpgradeResponse => {
      return decodeMessage(buf, UpgradeResponse.codec(), opts)
    }
  }

  export interface WebSocketMessage {
    opCode: http.WebSocketMessage.OpCode
    final: boolean
    payload: Uint8Array
    rsv1: boolean
    rsv2: boolean
    rsv3: boolean
  }

  export namespace WebSocketMessage {
    export enum OpCode {
      CONTINUATION = 'CONTINUATION',
      TEXT = 'TEXT',
      BINARY = 'BINARY',
      CLOSE = 'CLOSE',
      PING = 'PING',
      PONG = 'PONG'
    }

    enum __OpCodeValues {
      CONTINUATION = 0,
      TEXT = 1,
      BINARY = 2,
      CLOSE = 8,
      PING = 9,
      PONG = 10
    }

    export namespace OpCode {
      export const codec = (): Codec<OpCode> => {
        return enumeration<OpCode>(__OpCodeValues)
      }
    }

    let _codec: Codec<WebSocketMessage>

    export const codec = (): Codec<WebSocketMessage> => {
      if (_codec == null) {
        _codec = message<WebSocketMessage>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (obj.opCode != null && __OpCodeValues[obj.opCode] !== 0) {
            w.uint32(8)
            http.WebSocketMessage.OpCode.codec().encode(obj.opCode, w)
          }

          if ((obj.final != null && obj.final !== false)) {
            w.uint32(16)
            w.bool(obj.final)
          }

          if ((obj.payload != null && obj.payload.byteLength > 0)) {
            w.uint32(26)
            w.bytes(obj.payload)
          }

          if ((obj.rsv1 != null && obj.rsv1 !== false)) {
            w.uint32(32)
            w.bool(obj.rsv1)
          }

          if ((obj.rsv2 != null && obj.rsv2 !== false)) {
            w.uint32(40)
            w.bool(obj.rsv2)
          }

          if ((obj.rsv3 != null && obj.rsv3 !== false)) {
            w.uint32(48)
            w.bool(obj.rsv3)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            opCode: OpCode.CONTINUATION,
            final: false,
            payload: uint8ArrayAlloc(0),
            rsv1: false,
            rsv2: false,
            rsv3: false
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.opCode = http.WebSocketMessage.OpCode.codec().decode(reader)
                break
              }
              case 2: {
                obj.final = reader.bool()
                break
              }
              case 3: {
                obj.payload = reader.bytes()
                break
              }
              case 4: {
                obj.rsv1 = reader.bool()
                break
              }
              case 5: {
                obj.rsv2 = reader.bool()
                break
              }
              case 6: {
                obj.rsv3 = reader.bool()
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

    export const encode = (obj: Partial<WebSocketMessage>): Uint8Array => {
      return encodeMessage(obj, WebSocketMessage.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebSocketMessage>): WebSocketMessage => {
      return decodeMessage(buf, WebSocketMessage.codec(), opts)
    }
  }

  export interface WebTransportSession {
    sessionId: string
    streams: http.WebTransportSession.Stream[]
    datagrams: Uint8Array[]
  }

  export namespace WebTransportSession {
    export interface Stream {
      streamId: bigint
      unidirectional: boolean
      data: Uint8Array
    }

    export namespace Stream {
      let _codec: Codec<Stream>

      export const codec = (): Codec<Stream> => {
        if (_codec == null) {
          _codec = message<Stream>((obj, w, opts = {}) => {
            if (opts.lengthDelimited !== false) {
              w.fork()
            }

            if ((obj.streamId != null && obj.streamId !== 0n)) {
              w.uint32(8)
              w.uint64(obj.streamId)
            }

            if ((obj.unidirectional != null && obj.unidirectional !== false)) {
              w.uint32(16)
              w.bool(obj.unidirectional)
            }

            if ((obj.data != null && obj.data.byteLength > 0)) {
              w.uint32(26)
              w.bytes(obj.data)
            }

            if (opts.lengthDelimited !== false) {
              w.ldelim()
            }
          }, (reader, length, opts = {}) => {
            const obj: any = {
              streamId: 0n,
              unidirectional: false,
              data: uint8ArrayAlloc(0)
            }

            const end = length == null ? reader.len : reader.pos + length

            while (reader.pos < end) {
              const tag = reader.uint32()

              switch (tag >>> 3) {
                case 1: {
                  obj.streamId = reader.uint64()
                  break
                }
                case 2: {
                  obj.unidirectional = reader.bool()
                  break
                }
                case 3: {
                  obj.data = reader.bytes()
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

      export const encode = (obj: Partial<Stream>): Uint8Array => {
        return encodeMessage(obj, Stream.codec())
      }

      export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Stream>): Stream => {
        return decodeMessage(buf, Stream.codec(), opts)
      }
    }

    let _codec: Codec<WebTransportSession>

    export const codec = (): Codec<WebTransportSession> => {
      if (_codec == null) {
        _codec = message<WebTransportSession>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.sessionId != null && obj.sessionId !== '')) {
            w.uint32(10)
            w.string(obj.sessionId)
          }

          if (obj.streams != null) {
            for (const value of obj.streams) {
              w.uint32(18)
              http.WebTransportSession.Stream.codec().encode(value, w)
            }
          }

          if (obj.datagrams != null) {
            for (const value of obj.datagrams) {
              w.uint32(26)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            sessionId: '',
            streams: [],
            datagrams: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.sessionId = reader.string()
                break
              }
              case 2: {
                if (opts.limits?.streams != null && obj.streams.length === opts.limits.streams) {
                  throw new MaxLengthError('Decode error - map field "streams" had too many elements')
                }

                obj.streams.push(http.WebTransportSession.Stream.codec().decode(reader, reader.uint32(), {
                  limits: opts.limits?.streams$
                }))
                break
              }
              case 3: {
                if (opts.limits?.datagrams != null && obj.datagrams.length === opts.limits.datagrams) {
                  throw new MaxLengthError('Decode error - map field "datagrams" had too many elements')
                }

                obj.datagrams.push(reader.bytes())
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

    export const encode = (obj: Partial<WebTransportSession>): Uint8Array => {
      return encodeMessage(obj, WebTransportSession.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<WebTransportSession>): WebTransportSession => {
      return decodeMessage(buf, WebTransportSession.codec(), opts)
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
