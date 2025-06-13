import { decodeMessage, encodeMessage, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Envelope {
  publicKey: Uint8Array
  payloadType: Uint8Array
  payload: Uint8Array
  signature: Uint8Array
}

export namespace Envelope {
  let _codec: Codec<Envelope>

  export const codec = (): Codec<Envelope> => {
    if (_codec == null) {
      _codec = message<Envelope>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.publicKey != null && obj.publicKey.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.publicKey)
        }

        if ((obj.payloadType != null && obj.payloadType.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.payloadType)
        }

        if ((obj.payload != null && obj.payload.byteLength > 0)) {
          w.uint32(26)
          w.bytes(obj.payload)
        }

        if ((obj.signature != null && obj.signature.byteLength > 0)) {
          w.uint32(42)
          w.bytes(obj.signature)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          publicKey: uint8ArrayAlloc(0),
          payloadType: uint8ArrayAlloc(0),
          payload: uint8ArrayAlloc(0),
          signature: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.publicKey = reader.bytes()
              break
            }
            case 2: {
              obj.payloadType = reader.bytes()
              break
            }
            case 3: {
              obj.payload = reader.bytes()
              break
            }
            case 5: {
              obj.signature = reader.bytes()
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

  export const encode = (obj: Partial<Envelope>): Uint8Array => {
    return encodeMessage(obj, Envelope.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Envelope => {
    return decodeMessage(buf, Envelope.codec(), opts)
  }
}
