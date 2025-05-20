import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

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
      _codec = message<Record>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.key != null) {
          w.uint32(10)
          w.bytes(obj.key)
        }

        if (obj.value != null) {
          w.uint32(18)
          w.bytes(obj.value)
        }

        if (obj.author != null) {
          w.uint32(26)
          w.bytes(obj.author)
        }

        if (obj.signature != null) {
          w.uint32(34)
          w.bytes(obj.signature)
        }

        if (obj.timeReceived != null) {
          w.uint32(42)
          w.string(obj.timeReceived)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.key = reader.bytes()
              break
            }
            case 2: {
              obj.value = reader.bytes()
              break
            }
            case 3: {
              obj.author = reader.bytes()
              break
            }
            case 4: {
              obj.signature = reader.bytes()
              break
            }
            case 5: {
              obj.timeReceived = reader.string()
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

  export const encode = (obj: Partial<Record>): Uint8Array => {
    return encodeMessage(obj, Record.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Record>): Record => {
    return decodeMessage(buf, Record.codec(), opts)
  }
}

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
  export const codec = (): Codec<MessageType> => {
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
  export const codec = (): Codec<ConnectionType> => {
    return enumeration<ConnectionType>(__ConnectionTypeValues)
  }
}
export interface PeerInfo {
  id: Uint8Array
  multiaddrs: Uint8Array[]
  connection?: ConnectionType
}

export namespace PeerInfo {
  let _codec: Codec<PeerInfo>

  export const codec = (): Codec<PeerInfo> => {
    if (_codec == null) {
      _codec = message<PeerInfo>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.multiaddrs != null) {
          for (const value of obj.multiaddrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.connection != null) {
          w.uint32(24)
          ConnectionType.codec().encode(obj.connection, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          multiaddrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.id = reader.bytes()
              break
            }
            case 2: {
              if (opts.limits?.multiaddrs != null && obj.multiaddrs.length === opts.limits.multiaddrs) {
                throw new MaxLengthError('Decode error - map field "multiaddrs" had too many elements')
              }

              obj.multiaddrs.push(reader.bytes())
              break
            }
            case 3: {
              obj.connection = ConnectionType.codec().decode(reader)
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

  export const encode = (obj: Partial<PeerInfo>): Uint8Array => {
    return encodeMessage(obj, PeerInfo.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo => {
    return decodeMessage(buf, PeerInfo.codec(), opts)
  }
}

export interface Message {
  type: MessageType
  clusterLevel?: number
  key?: Uint8Array
  record?: Uint8Array
  closer: PeerInfo[]
  providers: PeerInfo[]
}

export namespace Message {
  let _codec: Codec<Message>

  export const codec = (): Codec<Message> => {
    if (_codec == null) {
      _codec = message<Message>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null && __MessageTypeValues[obj.type] !== 0) {
          w.uint32(8)
          MessageType.codec().encode(obj.type, w)
        }

        if (obj.clusterLevel != null) {
          w.uint32(80)
          w.int32(obj.clusterLevel)
        }

        if (obj.key != null) {
          w.uint32(18)
          w.bytes(obj.key)
        }

        if (obj.record != null) {
          w.uint32(26)
          w.bytes(obj.record)
        }

        if (obj.closer != null) {
          for (const value of obj.closer) {
            w.uint32(66)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (obj.providers != null) {
          for (const value of obj.providers) {
            w.uint32(74)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length, opts = {}) => {
        const obj: any = {
          type: MessageType.PUT_VALUE,
          closer: [],
          providers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = MessageType.codec().decode(reader)
              break
            }
            case 10: {
              obj.clusterLevel = reader.int32()
              break
            }
            case 2: {
              obj.key = reader.bytes()
              break
            }
            case 3: {
              obj.record = reader.bytes()
              break
            }
            case 8: {
              if (opts.limits?.closer != null && obj.closer.length === opts.limits.closer) {
                throw new MaxLengthError('Decode error - map field "closer" had too many elements')
              }

              obj.closer.push(PeerInfo.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.closer$
              }))
              break
            }
            case 9: {
              if (opts.limits?.providers != null && obj.providers.length === opts.limits.providers) {
                throw new MaxLengthError('Decode error - map field "providers" had too many elements')
              }

              obj.providers.push(PeerInfo.codec().decode(reader, reader.uint32(), {
                limits: opts.limits?.providers$
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

  export const encode = (obj: Partial<Message>): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Message>): Message => {
    return decodeMessage(buf, Message.codec(), opts)
  }
}
