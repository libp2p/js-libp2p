/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface CircuitRelay {
  type?: CircuitRelay.Type
  srcPeer?: CircuitRelay.Peer
  dstPeer?: CircuitRelay.Peer
  code?: CircuitRelay.Status
}

export namespace CircuitRelay {
  export enum Status {
    SUCCESS = 'SUCCESS',
    HOP_SRC_ADDR_TOO_LONG = 'HOP_SRC_ADDR_TOO_LONG',
    HOP_DST_ADDR_TOO_LONG = 'HOP_DST_ADDR_TOO_LONG',
    HOP_SRC_MULTIADDR_INVALID = 'HOP_SRC_MULTIADDR_INVALID',
    HOP_DST_MULTIADDR_INVALID = 'HOP_DST_MULTIADDR_INVALID',
    HOP_NO_CONN_TO_DST = 'HOP_NO_CONN_TO_DST',
    HOP_CANT_DIAL_DST = 'HOP_CANT_DIAL_DST',
    HOP_CANT_OPEN_DST_STREAM = 'HOP_CANT_OPEN_DST_STREAM',
    HOP_CANT_SPEAK_RELAY = 'HOP_CANT_SPEAK_RELAY',
    HOP_CANT_RELAY_TO_SELF = 'HOP_CANT_RELAY_TO_SELF',
    STOP_SRC_ADDR_TOO_LONG = 'STOP_SRC_ADDR_TOO_LONG',
    STOP_DST_ADDR_TOO_LONG = 'STOP_DST_ADDR_TOO_LONG',
    STOP_SRC_MULTIADDR_INVALID = 'STOP_SRC_MULTIADDR_INVALID',
    STOP_DST_MULTIADDR_INVALID = 'STOP_DST_MULTIADDR_INVALID',
    STOP_RELAY_REFUSED = 'STOP_RELAY_REFUSED',
    MALFORMED_MESSAGE = 'MALFORMED_MESSAGE'
  }

  enum __StatusValues {
    SUCCESS = 100,
    HOP_SRC_ADDR_TOO_LONG = 220,
    HOP_DST_ADDR_TOO_LONG = 221,
    HOP_SRC_MULTIADDR_INVALID = 250,
    HOP_DST_MULTIADDR_INVALID = 251,
    HOP_NO_CONN_TO_DST = 260,
    HOP_CANT_DIAL_DST = 261,
    HOP_CANT_OPEN_DST_STREAM = 262,
    HOP_CANT_SPEAK_RELAY = 270,
    HOP_CANT_RELAY_TO_SELF = 280,
    STOP_SRC_ADDR_TOO_LONG = 320,
    STOP_DST_ADDR_TOO_LONG = 321,
    STOP_SRC_MULTIADDR_INVALID = 350,
    STOP_DST_MULTIADDR_INVALID = 351,
    STOP_RELAY_REFUSED = 390,
    MALFORMED_MESSAGE = 400
  }

  export namespace Status {
    export const codec = () => {
      return enumeration<Status>(__StatusValues)
    }
  }

  export enum Type {
    HOP = 'HOP',
    STOP = 'STOP',
    STATUS = 'STATUS',
    CAN_HOP = 'CAN_HOP'
  }

  enum __TypeValues {
    HOP = 1,
    STOP = 2,
    STATUS = 3,
    CAN_HOP = 4
  }

  export namespace Type {
    export const codec = () => {
      return enumeration<Type>(__TypeValues)
    }
  }

  export interface Peer {
    id: Uint8Array
    addrs: Uint8Array[]
  }

  export namespace Peer {
    let _codec: Codec<Peer>

    export const codec = (): Codec<Peer> => {
      if (_codec == null) {
        _codec = message<Peer>((obj, writer, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            writer.fork()
          }

          if (obj.id != null) {
            writer.uint32(10)
            writer.bytes(obj.id)
          } else {
            throw new Error('Protocol error: required field "id" was not found in object')
          }

          if (obj.addrs != null) {
            for (const value of obj.addrs) {
              writer.uint32(18)
              writer.bytes(value)
            }
          } else {
            throw new Error('Protocol error: required field "addrs" was not found in object')
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
              case 1:
                obj.id = reader.bytes()
                break
              case 2:
                obj.addrs = obj.addrs ?? []
                obj.addrs.push(reader.bytes())
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }

          obj.addrs = obj.addrs ?? []

          if (obj.id == null) {
            throw new Error('Protocol error: value for required field "id" was not found in protobuf')
          }

          if (obj.addrs == null) {
            throw new Error('Protocol error: value for required field "addrs" was not found in protobuf')
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

  let _codec: Codec<CircuitRelay>

  export const codec = (): Codec<CircuitRelay> => {
    if (_codec == null) {
      _codec = message<CircuitRelay>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.type != null) {
          writer.uint32(8)
          CircuitRelay.Type.codec().encode(obj.type, writer)
        }

        if (obj.srcPeer != null) {
          writer.uint32(18)
          CircuitRelay.Peer.codec().encode(obj.srcPeer, writer)
        }

        if (obj.dstPeer != null) {
          writer.uint32(26)
          CircuitRelay.Peer.codec().encode(obj.dstPeer, writer)
        }

        if (obj.code != null) {
          writer.uint32(32)
          CircuitRelay.Status.codec().encode(obj.code, writer)
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
            case 1:
              obj.type = CircuitRelay.Type.codec().decode(reader)
              break
            case 2:
              obj.srcPeer = CircuitRelay.Peer.codec().decode(reader, reader.uint32())
              break
            case 3:
              obj.dstPeer = CircuitRelay.Peer.codec().decode(reader, reader.uint32())
              break
            case 4:
              obj.code = CircuitRelay.Status.codec().decode(reader)
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

  export const encode = (obj: CircuitRelay): Uint8Array => {
    return encodeMessage(obj, CircuitRelay.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): CircuitRelay => {
    return decodeMessage(buf, CircuitRelay.codec())
  }
}
