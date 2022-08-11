/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Identify {
  protocolVersion?: string
  agentVersion?: string
  publicKey?: Uint8Array
  listenAddrs: Uint8Array[]
  observedAddr?: Uint8Array
  protocols: string[]
  signedPeerRecord?: Uint8Array
}

export namespace Identify {
  let _codec: Codec<Identify>

  export const codec = (): Codec<Identify> => {
    if (_codec == null) {
      _codec = message<Identify>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.protocolVersion != null) {
          writer.uint32(42)
          writer.string(obj.protocolVersion)
        }

        if (obj.agentVersion != null) {
          writer.uint32(50)
          writer.string(obj.agentVersion)
        }

        if (obj.publicKey != null) {
          writer.uint32(10)
          writer.bytes(obj.publicKey)
        }

        if (obj.listenAddrs != null) {
          for (const value of obj.listenAddrs) {
            writer.uint32(18)
            writer.bytes(value)
          }
        } else {
          throw new Error('Protocol error: required field "listenAddrs" was not found in object')
        }

        if (obj.observedAddr != null) {
          writer.uint32(34)
          writer.bytes(obj.observedAddr)
        }

        if (obj.protocols != null) {
          for (const value of obj.protocols) {
            writer.uint32(26)
            writer.string(value)
          }
        } else {
          throw new Error('Protocol error: required field "protocols" was not found in object')
        }

        if (obj.signedPeerRecord != null) {
          writer.uint32(66)
          writer.bytes(obj.signedPeerRecord)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 5:
              obj.protocolVersion = reader.string()
              break
            case 6:
              obj.agentVersion = reader.string()
              break
            case 1:
              obj.publicKey = reader.bytes()
              break
            case 2:
              obj.listenAddrs = obj.listenAddrs ?? []
              obj.listenAddrs.push(reader.bytes())
              break
            case 4:
              obj.observedAddr = reader.bytes()
              break
            case 3:
              obj.protocols = obj.protocols ?? []
              obj.protocols.push(reader.string())
              break
            case 8:
              obj.signedPeerRecord = reader.bytes()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        obj.listenAddrs = obj.listenAddrs ?? []
        obj.protocols = obj.protocols ?? []

        if (obj.listenAddrs == null) {
          throw new Error('Protocol error: value for required field "listenAddrs" was not found in protobuf')
        }

        if (obj.protocols == null) {
          throw new Error('Protocol error: value for required field "protocols" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Identify): Uint8Array => {
    return encodeMessage(obj, Identify.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Identify => {
    return decodeMessage(buf, Identify.codec())
  }
}
