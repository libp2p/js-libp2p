/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

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
        _codec = message<AddressInfo>((obj, writer, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            writer.fork()
          }

          if (obj.multiaddr != null) {
            writer.uint32(10)
            writer.bytes(obj.multiaddr)
          } else {
            throw new Error('Protocol error: required field "multiaddr" was not found in object')
          }

          if (opts.lengthDelimited !== false) {
            writer.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
            multiaddr: new Uint8Array(0)
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.multiaddr = reader.bytes()
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          if (obj.multiaddr == null) {
            throw new Error('Protocol error: value for required field "multiaddr" was not found in protobuf')
          }

          return obj
        })
      }

      return _codec
    }

    export const encode = (obj: AddressInfo): Uint8Array => {
      return encodeMessage(obj, AddressInfo.codec())
    }

    export const decode = (buf: Uint8Array | Uint8ArrayList): AddressInfo => {
      return decodeMessage(buf, AddressInfo.codec())
    }
  }

  let _codec: Codec<PeerRecord>

  export const codec = (): Codec<PeerRecord> => {
    if (_codec == null) {
      _codec = message<PeerRecord>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.peerId != null) {
          writer.uint32(10)
          writer.bytes(obj.peerId)
        } else {
          throw new Error('Protocol error: required field "peerId" was not found in object')
        }

        if (obj.seq != null) {
          writer.uint32(16)
          writer.uint64(obj.seq)
        } else {
          throw new Error('Protocol error: required field "seq" was not found in object')
        }

        if (obj.addresses != null) {
          for (const value of obj.addresses) {
            writer.uint32(26)
            PeerRecord.AddressInfo.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "addresses" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peerId: new Uint8Array(0),
          seq: 0n,
          addresses: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peerId = reader.bytes()
              break
            case 2:
              obj.seq = reader.uint64()
              break
            case 3:
              obj.addresses.push(PeerRecord.AddressInfo.codec().decode(reader, reader.uint32()))
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        if (obj.peerId == null) {
          throw new Error('Protocol error: value for required field "peerId" was not found in protobuf')
        }

        if (obj.seq == null) {
          throw new Error('Protocol error: value for required field "seq" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: PeerRecord): Uint8Array => {
    return encodeMessage(obj, PeerRecord.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerRecord => {
    return decodeMessage(buf, PeerRecord.codec())
  }
}
