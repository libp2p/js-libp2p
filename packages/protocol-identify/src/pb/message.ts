import { decodeMessage, encodeMessage, MaxLengthError, message, streamMessage } from 'protons-runtime'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Identify {
  protocolVersion?: string
  agentVersion?: string
  publicKey?: Uint8Array<ArrayBuffer>
  listenAddrs: Uint8Array<ArrayBuffer>[]
  observedAddr?: Uint8Array<ArrayBuffer>
  protocols: string[]
  signedPeerRecord?: Uint8Array<ArrayBuffer>
}

export interface IdentifyInput {
  protocolVersion?: string
  agentVersion?: string
  publicKey?: Uint8Array
  listenAddrs?: Uint8Array[]
  observedAddr?: Uint8Array
  protocols?: string[]
  signedPeerRecord?: Uint8Array
}

export namespace Identify {
  let _codec: Codec<Identify, IdentifyInput>

  export const codec = (): Codec<Identify, IdentifyInput> => {
    if (_codec == null) {
      _codec = message<Identify, IdentifyInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.protocolVersion != null) {
          w.uint32(42)
          w.string(obj.protocolVersion)
        }

        if (obj.agentVersion != null) {
          w.uint32(50)
          w.string(obj.agentVersion)
        }

        if (obj.publicKey != null) {
          w.uint32(10)
          w.bytes(obj.publicKey)
        }

        if (obj.listenAddrs != null && obj.listenAddrs.length > 0) {
          for (const value of obj.listenAddrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.observedAddr != null) {
          w.uint32(34)
          w.bytes(obj.observedAddr)
        }

        if (obj.protocols != null && obj.protocols.length > 0) {
          for (const value of obj.protocols) {
            w.uint32(26)
            w.string(value)
          }
        }

        if (obj.signedPeerRecord != null) {
          w.uint32(66)
          w.bytes(obj.signedPeerRecord)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          listenAddrs: [],
          protocols: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 5: {
              obj.protocolVersion = r.string()
              break
            }
            case 6: {
              obj.agentVersion = r.string()
              break
            }
            case 1: {
              obj.publicKey = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.listenAddrs != null && obj.listenAddrs.length === opts.limits.listenAddrs) {
                throw new MaxLengthError('Decode error - repeated field "listenAddrs" had too many elements')
              }

              obj.listenAddrs.push(r.bytes())
              break
            }
            case 4: {
              obj.observedAddr = r.bytes()
              break
            }
            case 3: {
              if (opts.limits?.protocols != null && obj.protocols.length === opts.limits.protocols) {
                throw new MaxLengthError('Decode error - repeated field "protocols" had too many elements')
              }

              obj.protocols.push(r.string())
              break
            }
            case 8: {
              obj.signedPeerRecord = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          listenAddrs: 0,
          protocols: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Identify'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 5: {
              yield {
                field: `${prefix}protocolVersion`,
                value: r.string()
              }
              break
            }
            case 6: {
              yield {
                field: `${prefix}agentVersion`,
                value: r.string()
              }
              break
            }
            case 1: {
              yield {
                field: `${prefix}publicKey`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.listenAddrs != null && obj.listenAddrs === opts.limits.listenAddrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "listenAddrs" had too many elements')
              }

              yield {
                field: `${prefix}listenAddrs[]`,
                index: obj.listenAddrs,
                value: r.bytes()
              }

              obj.listenAddrs++

              break
            }
            case 4: {
              yield {
                field: `${prefix}observedAddr`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              if (opts.limits?.protocols != null && obj.protocols === opts.limits.protocols) {
                throw new MaxLengthError('Streaming decode error - repeated field "protocols" had too many elements')
              }

              yield {
                field: `${prefix}protocols[]`,
                index: obj.protocols,
                value: r.string()
              }

              obj.protocols++

              break
            }
            case 8: {
              yield {
                field: `${prefix}signedPeerRecord`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Identify'
          }
        }
      })
    }

    return _codec
  }

  export interface IdentifyProtocolVersionFieldEvent {
    field: '.protocolVersion'
    value: string
  }

  export interface IdentifyAgentVersionFieldEvent {
    field: '.agentVersion'
    value: string
  }

  export interface IdentifyPublicKeyFieldEvent {
    field: '.publicKey'
    value: Uint8Array<ArrayBuffer>
  }

  export interface IdentifyListenAddrsFieldEvent {
    field: '.listenAddrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface IdentifyObservedAddrFieldEvent {
    field: '.observedAddr'
    value: Uint8Array<ArrayBuffer>
  }

  export interface IdentifyProtocolsFieldEvent {
    field: '.protocols[]'
    index: number
    value: string
  }

  export interface IdentifySignedPeerRecordFieldEvent {
    field: '.signedPeerRecord'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: IdentifyInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Identify.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Identify>): Identify {
    return decodeMessage(buf, Identify.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Identify>): Generator<IdentifyProtocolVersionFieldEvent | IdentifyAgentVersionFieldEvent | IdentifyPublicKeyFieldEvent | IdentifyListenAddrsFieldEvent | IdentifyObservedAddrFieldEvent | IdentifyProtocolsFieldEvent | IdentifySignedPeerRecordFieldEvent> {
    return streamMessage(buf, Identify.codec(), opts)
  }
}
