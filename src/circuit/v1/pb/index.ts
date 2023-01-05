/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */

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
        _codec = message<Peer>((obj, w, opts = {}) => {
          if (opts.lengthDelimited !== false) {
            w.fork()
          }

          if (opts.writeDefaults === true || (obj.id != null && obj.id.byteLength > 0)) {
            w.uint32(10)
            w.bytes(obj.id)
          }

          if (obj.addrs != null) {
            for (const value of obj.addrs) {
              w.uint32(18)
              w.bytes(value)
            }
          }

          if (opts.lengthDelimited !== false) {
            w.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
            id: new Uint8Array(0),
            addrs: []
          }

          const end = length == null ? reader.len : reader.pos + length

          while (reader.pos < end) {
            const tag = reader.uint32()

            switch (tag >>> 3) {
              case 1:
                obj.id = reader.bytes()
                break
              case 2:
                obj.addrs.push(reader.bytes())
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

  let _codec: Codec<CircuitRelay>

  export const codec = (): Codec<CircuitRelay> => {
    if (_codec == null) {
      _codec = message<CircuitRelay>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          CircuitRelay.Type.codec().encode(obj.type, w)
        }

        if (obj.srcPeer != null) {
          w.uint32(18)
          CircuitRelay.Peer.codec().encode(obj.srcPeer, w, {
            writeDefaults: false
          })
        }

        if (obj.dstPeer != null) {
          w.uint32(26)
          CircuitRelay.Peer.codec().encode(obj.dstPeer, w, {
            writeDefaults: false
          })
        }

        if (obj.code != null) {
          w.uint32(32)
          CircuitRelay.Status.codec().encode(obj.code, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
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
