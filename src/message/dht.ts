/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, enumeration } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface Record {
  key?: Uint8Array
  value?: Uint8Array
  author?: Uint8Array
  signature?: Uint8Array
  timeReceived?: string
}

export namespace Record {
  let _codec: Codec<Record>

  export const codec = (): Codec<Record> => {
    if (_codec == null) {
      _codec = message<Record>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.key != null) {
          writer.uint32(10)
          writer.bytes(obj.key)
        }

        if (obj.value != null) {
          writer.uint32(18)
          writer.bytes(obj.value)
        }

        if (obj.author != null) {
          writer.uint32(26)
          writer.bytes(obj.author)
        }

        if (obj.signature != null) {
          writer.uint32(34)
          writer.bytes(obj.signature)
        }

        if (obj.timeReceived != null) {
          writer.uint32(42)
          writer.string(obj.timeReceived)
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
              obj.key = reader.bytes()
              break
            case 2:
              obj.value = reader.bytes()
              break
            case 3:
              obj.author = reader.bytes()
              break
            case 4:
              obj.signature = reader.bytes()
              break
            case 5:
              obj.timeReceived = reader.string()
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

  export const encode = (obj: Record): Uint8Array => {
    return encodeMessage(obj, Record.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Record => {
    return decodeMessage(buf, Record.codec())
  }
}

export interface Message {
  type?: Message.MessageType
  clusterLevelRaw?: number
  key?: Uint8Array
  record?: Uint8Array
  closerPeers: Message.Peer[]
  providerPeers: Message.Peer[]
}

export namespace Message {
  export enum MessageType {
    PUT_VALUE = 'PUT_VALUE',
    GET_VALUE = 'GET_VALUE',
    ADD_PROVIDER = 'ADD_PROVIDER',
    GET_PROVIDERS = 'GET_PROVIDERS',
    FIND_NODE = 'FIND_NODE',
    PING = 'PING'
  }

  enum __MessageTypeValues {
    PUT_VALUE = 0,
    GET_VALUE = 1,
    ADD_PROVIDER = 2,
    GET_PROVIDERS = 3,
    FIND_NODE = 4,
    PING = 5
  }

  export namespace MessageType {
    export const codec = () => {
      return enumeration<MessageType>(__MessageTypeValues)
    }
  }

  export enum ConnectionType {
    NOT_CONNECTED = 'NOT_CONNECTED',
    CONNECTED = 'CONNECTED',
    CAN_CONNECT = 'CAN_CONNECT',
    CANNOT_CONNECT = 'CANNOT_CONNECT'
  }

  enum __ConnectionTypeValues {
    NOT_CONNECTED = 0,
    CONNECTED = 1,
    CAN_CONNECT = 2,
    CANNOT_CONNECT = 3
  }

  export namespace ConnectionType {
    export const codec = () => {
      return enumeration<ConnectionType>(__ConnectionTypeValues)
    }
  }

  export interface Peer {
    id?: Uint8Array
    addrs: Uint8Array[]
    connection?: Message.ConnectionType
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
          }

          if (obj.addrs != null) {
            for (const value of obj.addrs) {
              writer.uint32(18)
              writer.bytes(value)
            }
          } else {
            throw new Error('Protocol error: required field "addrs" was not found in object')
          }

          if (obj.connection != null) {
            writer.uint32(24)
            Message.ConnectionType.codec().encode(obj.connection, writer)
          }

          if (opts.lengthDelimited !== false) {
            writer.ldelim()
          }
        }, (reader, length) => {
          const obj: any = {
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
              case 3:
                obj.connection = Message.ConnectionType.codec().decode(reader)
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

  let _codec: Codec<Message>

  export const codec = (): Codec<Message> => {
    if (_codec == null) {
      _codec = message<Message>((obj, writer, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          writer.fork()
        }

        if (obj.type != null) {
          writer.uint32(8)
          Message.MessageType.codec().encode(obj.type, writer)
        }

        if (obj.clusterLevelRaw != null) {
          writer.uint32(80)
          writer.int32(obj.clusterLevelRaw)
        }

        if (obj.key != null) {
          writer.uint32(18)
          writer.bytes(obj.key)
        }

        if (obj.record != null) {
          writer.uint32(26)
          writer.bytes(obj.record)
        }

        if (obj.closerPeers != null) {
          for (const value of obj.closerPeers) {
            writer.uint32(66)
            Message.Peer.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "closerPeers" was not found in object')
        }

        if (obj.providerPeers != null) {
          for (const value of obj.providerPeers) {
            writer.uint32(74)
            Message.Peer.codec().encode(value, writer)
          }
        } else {
          throw new Error('Protocol error: required field "providerPeers" was not found in object')
        }

        if (opts.lengthDelimited !== false) {
          writer.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          closerPeers: [],
          providerPeers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = Message.MessageType.codec().decode(reader)
              break
            case 10:
              obj.clusterLevelRaw = reader.int32()
              break
            case 2:
              obj.key = reader.bytes()
              break
            case 3:
              obj.record = reader.bytes()
              break
            case 8:
              obj.closerPeers.push(Message.Peer.codec().decode(reader, reader.uint32()))
              break
            case 9:
              obj.providerPeers.push(Message.Peer.codec().decode(reader, reader.uint32()))
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

  export const encode = (obj: Message): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Message => {
    return decodeMessage(buf, Message.codec())
  }
}
