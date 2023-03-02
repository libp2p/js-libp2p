/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Peer {
  addresses: Address[]
  protocols: string[]
  metadata: Metadata[]
  pubKey?: Uint8Array
  peerRecordEnvelope?: Uint8Array
}

export namespace Peer {
  let _codec: Codec<Peer>

  export const codec = (): Codec<Peer> => {
    if (_codec == null) {
      _codec = message<Peer>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.addresses != null) {
          for (const value of obj.addresses) {
            w.uint32(10)
            Address.codec().encode(value, w)
          }
        }

        if (obj.protocols != null) {
          for (const value of obj.protocols) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (obj.metadata != null) {
          for (const value of obj.metadata) {
            w.uint32(26)
            Metadata.codec().encode(value, w)
          }
        }

        if (obj.pubKey != null) {
          w.uint32(34)
          w.bytes(obj.pubKey)
        }

        if (obj.peerRecordEnvelope != null) {
          w.uint32(42)
          w.bytes(obj.peerRecordEnvelope)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          addresses: [],
          protocols: [],
          metadata: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.addresses.push(Address.codec().decode(reader, reader.uint32()))
              break
            case 2:
              obj.protocols.push(reader.string())
              break
            case 3:
              obj.metadata.push(Metadata.codec().decode(reader, reader.uint32()))
              break
            case 4:
              obj.pubKey = reader.bytes()
              break
            case 5:
              obj.peerRecordEnvelope = reader.bytes()
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

  export const encode = (obj: Partial<Peer>): Uint8Array => {
    return encodeMessage(obj, Peer.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Peer => {
    return decodeMessage(buf, Peer.codec())
  }
}

export interface Address {
  multiaddr: Uint8Array
  isCertified?: boolean
}

export namespace Address {
  let _codec: Codec<Address>

  export const codec = (): Codec<Address> => {
    if (_codec == null) {
      _codec = message<Address>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.multiaddr != null && obj.multiaddr.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.multiaddr)
        }

        if (obj.isCertified != null) {
          w.uint32(16)
          w.bool(obj.isCertified)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
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
            case 2:
              obj.isCertified = reader.bool()
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

  export const encode = (obj: Partial<Address>): Uint8Array => {
    return encodeMessage(obj, Address.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Address => {
    return decodeMessage(buf, Address.codec())
  }
}

export interface Metadata {
  key: string
  value: Uint8Array
}

export namespace Metadata {
  let _codec: Codec<Metadata>

  export const codec = (): Codec<Metadata> => {
    if (_codec == null) {
      _codec = message<Metadata>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.key != null && obj.key !== '')) {
          w.uint32(10)
          w.string(obj.key)
        }

        if ((obj.value != null && obj.value.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.value)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          key: '',
          value: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.key = reader.string()
              break
            case 2:
              obj.value = reader.bytes()
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

  export const encode = (obj: Partial<Metadata>): Uint8Array => {
    return encodeMessage(obj, Metadata.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Metadata => {
    return decodeMessage(buf, Metadata.codec())
  }
}
