import { decodeMessage, encodeMessage, MaxLengthError, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface PeerRecord {
  peerId: Uint8Array
  seq: bigint
  addresses: PeerRecord.AddressInfo[]
}

export namespace PeerRecord {
  export interface AddressInfo {
    multiaddr: Uint8Array
  }

  export namespace AddressInfo {
    let _codec: Codec<AddressInfo>

    export const codec = (): Codec<AddressInfo> => {
      if (_codec == null) {
        _codec = message<AddressInfo>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if ((obj.multiaddr != null && obj.multiaddr.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.multiaddr)
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length, opts = {}) => {
          const obj: any = {
            multiaddr: uint8ArrayAlloc(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1: {
                obj.multiaddr = reader.bytes()
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

    export const encode = (obj: Partial<AddressInfo>): Uint8Array => {
      return encodeMessage(obj, AddressInfo.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<AddressInfo>): AddressInfo => {
      return decodeMessage(buf, AddressInfo.codec(), opts)
    }
  }

  let _codec: Codec<PeerRecord>

  export const codec = (): Codec<PeerRecord> => {
    if (_codec == null) {
      _codec = message<PeerRecord>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peerId != null && obj.peerId.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peerId)
        }

        if ((obj.seq != null && obj.seq !== 0n)) {
          w.uint32(16)
          w.uint64(obj.seq)
        }

        if (obj.addresses != null) {
          for (const value of obj.addresses) {
            w.uint32(26)
            PeerRecord.AddressInfo.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          peerId: uint8ArrayAlloc(0),
          seq: 0n,
          addresses: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peerId = reader.bytes()
              break
            }
            case 2: {
              obj.seq = reader.uint64()
              break
            }
            case 3: {
              if (opts.limits?.addresses != null && obj.addresses.length === opts.limits.addresses) {
                throw new MaxLengthError('Decode error - map field "addresses" had too many elements')
              }

              obj.addresses.push(PeerRecord.AddressInfo.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.addresses$
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

  export const encode = (obj: Partial<PeerRecord>): Uint8Array => {
    return encodeMessage(obj, PeerRecord.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerRecord>): PeerRecord => {
    return decodeMessage(buf, PeerRecord.codec(), opts)
  }
}
