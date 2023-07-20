/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface NoiseExtensions {
  webtransportCerthashes: Uint8Array[]
}

export namespace NoiseExtensions {
  let _codec: Codec<NoiseExtensions>

  export const codec = (): Codec<NoiseExtensions> => {
    if (_codec == null) {
      _codec = message<NoiseExtensions>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.webtransportCerthashes != null) {
          for (const value of obj.webtransportCerthashes) {
            w.uint32(10)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          webtransportCerthashes: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.webtransportCerthashes.push(reader.bytes())
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

  export const encode = (obj: Partial<NoiseExtensions>): Uint8Array => {
    return encodeMessage(obj, NoiseExtensions.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): NoiseExtensions => {
    return decodeMessage(buf, NoiseExtensions.codec())
  }
}

export interface NoiseHandshakePayload {
  identityKey: Uint8Array
  identitySig: Uint8Array
  extensions?: NoiseExtensions
}

export namespace NoiseHandshakePayload {
  let _codec: Codec<NoiseHandshakePayload>

  export const codec = (): Codec<NoiseHandshakePayload> => {
    if (_codec == null) {
      _codec = message<NoiseHandshakePayload>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || (obj.identityKey != null && obj.identityKey.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.identityKey ?? new Uint8Array(0))
        }

        if (opts.writeDefaults === true || (obj.identitySig != null && obj.identitySig.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.identitySig ?? new Uint8Array(0))
        }

        if (obj.extensions != null) {
          w.uint32(34)
          NoiseExtensions.codec().encode(obj.extensions, w, {
            writeDefaults: false
          })
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          identityKey: new Uint8Array(0),
          identitySig: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.identityKey = reader.bytes()
              break
            case 2:
              obj.identitySig = reader.bytes()
              break
            case 4:
              obj.extensions = NoiseExtensions.codec().decode(reader, reader.uint32())
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

  export const encode = (obj: Partial<NoiseHandshakePayload>): Uint8Array => {
    return encodeMessage(obj, NoiseHandshakePayload.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): NoiseHandshakePayload => {
    return decodeMessage(buf, NoiseHandshakePayload.codec())
  }
}
