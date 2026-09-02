import { decodeMessage, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface NoiseExtensions {
  webtransportCerthashes: Uint8Array[]
  streamMuxers: string[]
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

        if (obj.streamMuxers != null) {
          for (const value of obj.streamMuxers) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          webtransportCerthashes: [],
          streamMuxers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.webtransportCerthashes != null && obj.webtransportCerthashes.length === opts.limits.webtransportCerthashes) {
                throw new MaxLengthError('Decode error - map field "webtransportCerthashes" had too many elements')
              }

              obj.webtransportCerthashes.push(reader.bytes())
              break
            }
            case 2: {
              if (opts.limits?.streamMuxers != null && obj.streamMuxers.length === opts.limits.streamMuxers) {
                throw new MaxLengthError('Decode error - map field "streamMuxers" had too many elements')
              }

              obj.streamMuxers.push(reader.string())
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

  export const encode = (obj: Partial<NoiseExtensions>): Uint8Array => {
    return encodeMessage(obj, NoiseExtensions.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<NoiseExtensions>): NoiseExtensions => {
    return decodeMessage(buf, NoiseExtensions.codec(), opts)
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

        if ((obj.identityKey != null && obj.identityKey.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.identityKey)
        }

        if ((obj.identitySig != null && obj.identitySig.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.identitySig)
        }

        if (obj.extensions != null) {
          w.uint32(34)
          NoiseExtensions.codec().encode(obj.extensions, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          identityKey: uint8ArrayAlloc(0),
          identitySig: uint8ArrayAlloc(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.identityKey = reader.bytes()
              break
            }
            case 2: {
              obj.identitySig = reader.bytes()
              break
            }
            case 4: {
              obj.extensions = NoiseExtensions.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.extensions
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

  export const encode = (obj: Partial<NoiseHandshakePayload>): Uint8Array => {
    return encodeMessage(obj, NoiseHandshakePayload.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<NoiseHandshakePayload>): NoiseHandshakePayload => {
    return decodeMessage(buf, NoiseHandshakePayload.codec(), opts)
  }
}
