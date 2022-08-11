/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

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
      _codec = message<Peer>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.addresses != null) {
          for (const value of obj.addresses) {
            writer.uint32(10)
            Address.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "addresses" was not found in object')
        }

        if (obj.protocols != null) {
          for (const value of obj.protocols) {
            writer.uint32(18)
            writer.string(value)
          }
        } else {
          throw new Error('Protocol error: required field "protocols" was not found in object')
        }

        if (obj.metadata != null) {
          for (const value of obj.metadata) {
            writer.uint32(26)
            Metadata.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "metadata" was not found in object')
        }

        if (obj.pubKey != null) {
          writer.uint32(34)
          writer.bytes(obj.pubKey)
        }

        if (obj.peerRecordEnvelope != null) {
          writer.uint32(42)
          writer.bytes(obj.peerRecordEnvelope)
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

  export const encode = (obj: Peer): Uint8Array => {
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
      _codec = message<Address>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.multiaddr != null) {
          writer.uint32(10)
          writer.bytes(obj.multiaddr)
        } else {
          throw new Error('Protocol error: required field "multiaddr" was not found in object')
        }

        if (obj.isCertified != null) {
          writer.uint32(16)
          writer.bool(obj.isCertified)
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
            case 2:
              obj.isCertified = reader.bool()
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

  export const encode = (obj: Address): Uint8Array => {
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
      _codec = message<Metadata>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.key != null) {
          writer.uint32(10)
          writer.string(obj.key)
        } else {
          throw new Error('Protocol error: required field "key" was not found in object')
        }

        if (obj.value != null) {
          writer.uint32(18)
          writer.bytes(obj.value)
        } else {
          throw new Error('Protocol error: required field "value" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
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

        if (obj.key == null) {
          throw new Error('Protocol error: value for required field "key" was not found in protobuf')
        }

        if (obj.value == null) {
          throw new Error('Protocol error: value for required field "value" was not found in protobuf')
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: Metadata): Uint8Array => {
    return encodeMessage(obj, Metadata.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Metadata => {
    return decodeMessage(buf, Metadata.codec())
  }
}
