/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */

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
      _codec = message<Identify>((obj, w, opts = {}) => {
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

        if (obj.listenAddrs != null) {
          for (const value of obj.listenAddrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.observedAddr != null) {
          w.uint32(34)
          w.bytes(obj.observedAddr)
        }

        if (obj.protocols != null) {
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
      }, (reader, length) => {
        const obj: any = {
          listenAddrs: [],
          protocols: []
        }

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
              obj.listenAddrs.push(reader.bytes())
              break
            case 4:
              obj.observedAddr = reader.bytes()
              break
            case 3:
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
