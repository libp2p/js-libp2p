import { decodeMessage, encodeMessage, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Envelope {
  publicKey: Uint8Array<ArrayBuffer>
  payloadType: Uint8Array<ArrayBuffer>
  payload: Uint8Array<ArrayBuffer>
  signature: Uint8Array<ArrayBuffer>
}

export interface EnvelopeInput {
  publicKey?: Uint8Array
  payloadType?: Uint8Array
  payload?: Uint8Array
  signature?: Uint8Array
}

export namespace Envelope {
  let _codec: Codec<Envelope, EnvelopeInput>

  export const codec = (): Codec<Envelope, EnvelopeInput> => {
    if (_codec == null) {
      _codec = message<Envelope, EnvelopeInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {
          publicKey: uint8ArrayAlloc(0),
          payloadType: uint8ArrayAlloc(0),
          payload: uint8ArrayAlloc(0),
          signature: uint8ArrayAlloc(0)
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.publicKey = r.bytes()
              break
            }
            case 2: {
              obj.payloadType = r.bytes()
              break
            }
            case 3: {
              obj.payload = r.bytes()
              break
            }
            case 5: {
              obj.signature = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Envelope'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}publicKey`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}payloadType`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}payload`,
                value: r.bytes()
              }
              break
            }
            case 5: {
              yield {
                field: `${prefix}signature`,
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
            message: 'Envelope'
          }
        }
      })
    }

    return _codec
  }

  export interface EnvelopePublicKeyFieldEvent {
    field: '.publicKey'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadTypeFieldEvent {
    field: '.payloadType'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopePayloadFieldEvent {
    field: '.payload'
    value: Uint8Array<ArrayBuffer>
  }

  export interface EnvelopeSignatureFieldEvent {
    field: '.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: EnvelopeInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Envelope.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Envelope {
    return decodeMessage(buf, Envelope.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Envelope>): Generator<EnvelopePublicKeyFieldEvent | EnvelopePayloadTypeFieldEvent | EnvelopePayloadFieldEvent | EnvelopeSignatureFieldEvent> {
    return streamMessage(buf, Envelope.codec(), opts)
  }
}
