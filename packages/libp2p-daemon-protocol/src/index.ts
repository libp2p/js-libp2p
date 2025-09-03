import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Codec } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface Request {
  type?: Request.Type
  connect?: ConnectRequest
  streamOpen?: StreamOpenRequest
  streamHandler?: StreamHandlerRequest
  dht?: DHTRequest
  connManager?: ConnManagerRequest
  disconnect?: DisconnectRequest
  pubsub?: PSRequest
  peerStore?: PeerstoreRequest
}

export namespace Request {
  export enum Type {
    IDENTIFY = 'IDENTIFY',
    CONNECT = 'CONNECT',
    STREAM_OPEN = 'STREAM_OPEN',
    STREAM_HANDLER = 'STREAM_HANDLER',
    DHT = 'DHT',
    LIST_PEERS = 'LIST_PEERS',
    CONNMANAGER = 'CONNMANAGER',
    DISCONNECT = 'DISCONNECT',
    PUBSUB = 'PUBSUB',
    PEERSTORE = 'PEERSTORE'
  }

  enum __TypeValues {
    IDENTIFY = 0,
    CONNECT = 1,
    STREAM_OPEN = 2,
    STREAM_HANDLER = 3,
    DHT = 4,
    LIST_PEERS = 5,
    CONNMANAGER = 6,
    DISCONNECT = 7,
    PUBSUB = 8,
    PEERSTORE = 9
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<Request>

  export const codec = (): Codec<Request> => {
    if (_codec == null) {
      _codec = message<Request>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          Request.Type.codec().encode(obj.type, w)
        }

        if (obj.connect != null) {
          w.uint32(18)
          ConnectRequest.codec().encode(obj.connect, w)
        }

        if (obj.streamOpen != null) {
          w.uint32(26)
          StreamOpenRequest.codec().encode(obj.streamOpen, w)
        }

        if (obj.streamHandler != null) {
          w.uint32(34)
          StreamHandlerRequest.codec().encode(obj.streamHandler, w)
        }

        if (obj.dht != null) {
          w.uint32(42)
          DHTRequest.codec().encode(obj.dht, w)
        }

        if (obj.connManager != null) {
          w.uint32(50)
          ConnManagerRequest.codec().encode(obj.connManager, w)
        }

        if (obj.disconnect != null) {
          w.uint32(58)
          DisconnectRequest.codec().encode(obj.disconnect, w)
        }

        if (obj.pubsub != null) {
          w.uint32(66)
          PSRequest.codec().encode(obj.pubsub, w)
        }

        if (obj.peerStore != null) {
          w.uint32(74)
          PeerstoreRequest.codec().encode(obj.peerStore, w)
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
              obj.type = Request.Type.codec().decode(reader)
              break
            case 2:
              obj.connect = ConnectRequest.codec().decode(reader, reader.uint32())
              break
            case 3:
              obj.streamOpen = StreamOpenRequest.codec().decode(reader, reader.uint32())
              break
            case 4:
              obj.streamHandler = StreamHandlerRequest.codec().decode(reader, reader.uint32())
              break
            case 5:
              obj.dht = DHTRequest.codec().decode(reader, reader.uint32())
              break
            case 6:
              obj.connManager = ConnManagerRequest.codec().decode(reader, reader.uint32())
              break
            case 7:
              obj.disconnect = DisconnectRequest.codec().decode(reader, reader.uint32())
              break
            case 8:
              obj.pubsub = PSRequest.codec().decode(reader, reader.uint32())
              break
            case 9:
              obj.peerStore = PeerstoreRequest.codec().decode(reader, reader.uint32())
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

  export const encode = (obj: Partial<Request>): Uint8Array => {
    return encodeMessage(obj, Request.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Request => {
    return decodeMessage(buf, Request.codec())
  }
}

export interface Response {
  type?: Response.Type
  error?: ErrorResponse
  streamInfo?: StreamInfo
  identify?: IdentifyResponse
  dht?: DHTResponse
  peers: PeerInfo[]
  pubsub?: PSResponse
  peerStore?: PeerstoreResponse
}

export namespace Response {
  export enum Type {
    OK = 'OK',
    ERROR = 'ERROR'
  }

  enum __TypeValues {
    OK = 0,
    ERROR = 1
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<Response>

  export const codec = (): Codec<Response> => {
    if (_codec == null) {
      _codec = message<Response>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          Response.Type.codec().encode(obj.type, w)
        }

        if (obj.error != null) {
          w.uint32(18)
          ErrorResponse.codec().encode(obj.error, w)
        }

        if (obj.streamInfo != null) {
          w.uint32(26)
          StreamInfo.codec().encode(obj.streamInfo, w)
        }

        if (obj.identify != null) {
          w.uint32(34)
          IdentifyResponse.codec().encode(obj.identify, w)
        }

        if (obj.dht != null) {
          w.uint32(42)
          DHTResponse.codec().encode(obj.dht, w)
        }

        if (obj.peers != null) {
          for (const value of obj.peers) {
            w.uint32(50)
            PeerInfo.codec().encode(value, w)
          }
        }

        if (obj.pubsub != null) {
          w.uint32(58)
          PSResponse.codec().encode(obj.pubsub, w)
        }

        if (obj.peerStore != null) {
          w.uint32(66)
          PeerstoreResponse.codec().encode(obj.peerStore, w)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peers: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = Response.Type.codec().decode(reader)
              break
            case 2:
              obj.error = ErrorResponse.codec().decode(reader, reader.uint32())
              break
            case 3:
              obj.streamInfo = StreamInfo.codec().decode(reader, reader.uint32())
              break
            case 4:
              obj.identify = IdentifyResponse.codec().decode(reader, reader.uint32())
              break
            case 5:
              obj.dht = DHTResponse.codec().decode(reader, reader.uint32())
              break
            case 6:
              obj.peers.push(PeerInfo.codec().decode(reader, reader.uint32()))
              break
            case 7:
              obj.pubsub = PSResponse.codec().decode(reader, reader.uint32())
              break
            case 8:
              obj.peerStore = PeerstoreResponse.codec().decode(reader, reader.uint32())
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

  export const encode = (obj: Partial<Response>): Uint8Array => {
    return encodeMessage(obj, Response.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): Response => {
    return decodeMessage(buf, Response.codec())
  }
}

export interface IdentifyResponse {
  id: Uint8Array
  addrs: Uint8Array[]
}

export namespace IdentifyResponse {
  let _codec: Codec<IdentifyResponse>

  export const codec = (): Codec<IdentifyResponse> => {
    if (_codec == null) {
      _codec = message<IdentifyResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.id != null && obj.id.byteLength > 0)) {
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

  export const encode = (obj: Partial<IdentifyResponse>): Uint8Array => {
    return encodeMessage(obj, IdentifyResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): IdentifyResponse => {
    return decodeMessage(buf, IdentifyResponse.codec())
  }
}

export interface ConnectRequest {
  peer: Uint8Array
  addrs: Uint8Array[]
  timeout?: bigint
}

export namespace ConnectRequest {
  let _codec: Codec<ConnectRequest>

  export const codec = (): Codec<ConnectRequest> => {
    if (_codec == null) {
      _codec = message<ConnectRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if (obj.addrs != null) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (obj.timeout != null) {
          w.uint32(24)
          w.int64(obj.timeout)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peer: new Uint8Array(0),
          addrs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peer = reader.bytes()
              break
            case 2:
              obj.addrs.push(reader.bytes())
              break
            case 3:
              obj.timeout = reader.int64()
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

  export const encode = (obj: Partial<ConnectRequest>): Uint8Array => {
    return encodeMessage(obj, ConnectRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ConnectRequest => {
    return decodeMessage(buf, ConnectRequest.codec())
  }
}

export interface StreamOpenRequest {
  peer: Uint8Array
  proto: string[]
  timeout?: bigint
}

export namespace StreamOpenRequest {
  let _codec: Codec<StreamOpenRequest>

  export const codec = (): Codec<StreamOpenRequest> => {
    if (_codec == null) {
      _codec = message<StreamOpenRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if (obj.proto != null) {
          for (const value of obj.proto) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (obj.timeout != null) {
          w.uint32(24)
          w.int64(obj.timeout)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peer: new Uint8Array(0),
          proto: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peer = reader.bytes()
              break
            case 2:
              obj.proto.push(reader.string())
              break
            case 3:
              obj.timeout = reader.int64()
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

  export const encode = (obj: Partial<StreamOpenRequest>): Uint8Array => {
    return encodeMessage(obj, StreamOpenRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): StreamOpenRequest => {
    return decodeMessage(buf, StreamOpenRequest.codec())
  }
}

export interface StreamHandlerRequest {
  addr: Uint8Array
  proto: string[]
}

export namespace StreamHandlerRequest {
  let _codec: Codec<StreamHandlerRequest>

  export const codec = (): Codec<StreamHandlerRequest> => {
    if (_codec == null) {
      _codec = message<StreamHandlerRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.addr != null && obj.addr.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.addr)
        }

        if (obj.proto != null) {
          for (const value of obj.proto) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          addr: new Uint8Array(0),
          proto: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.addr = reader.bytes()
              break
            case 2:
              obj.proto.push(reader.string())
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

  export const encode = (obj: Partial<StreamHandlerRequest>): Uint8Array => {
    return encodeMessage(obj, StreamHandlerRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): StreamHandlerRequest => {
    return decodeMessage(buf, StreamHandlerRequest.codec())
  }
}

export interface ErrorResponse {
  msg: string
}

export namespace ErrorResponse {
  let _codec: Codec<ErrorResponse>

  export const codec = (): Codec<ErrorResponse> => {
    if (_codec == null) {
      _codec = message<ErrorResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.msg != null && obj.msg !== '')) {
          w.uint32(10)
          w.string(obj.msg)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          msg: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.msg = reader.string()
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

  export const encode = (obj: Partial<ErrorResponse>): Uint8Array => {
    return encodeMessage(obj, ErrorResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ErrorResponse => {
    return decodeMessage(buf, ErrorResponse.codec())
  }
}

export interface StreamInfo {
  peer: Uint8Array
  addr: Uint8Array
  proto: string
}

export namespace StreamInfo {
  let _codec: Codec<StreamInfo>

  export const codec = (): Codec<StreamInfo> => {
    if (_codec == null) {
      _codec = message<StreamInfo>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if ((obj.addr != null && obj.addr.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.addr)
        }

        if ((obj.proto != null && obj.proto !== '')) {
          w.uint32(26)
          w.string(obj.proto)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peer: new Uint8Array(0),
          addr: new Uint8Array(0),
          proto: ''
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peer = reader.bytes()
              break
            case 2:
              obj.addr = reader.bytes()
              break
            case 3:
              obj.proto = reader.string()
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

  export const encode = (obj: Partial<StreamInfo>): Uint8Array => {
    return encodeMessage(obj, StreamInfo.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): StreamInfo => {
    return decodeMessage(buf, StreamInfo.codec())
  }
}

export interface DHTRequest {
  type?: DHTRequest.Type
  peer?: Uint8Array
  cid?: Uint8Array
  key?: Uint8Array
  value?: Uint8Array
  count?: number
  timeout?: bigint
}

export namespace DHTRequest {
  export enum Type {
    FIND_PEER = 'FIND_PEER',
    FIND_PEERS_CONNECTED_TO_PEER = 'FIND_PEERS_CONNECTED_TO_PEER',
    FIND_PROVIDERS = 'FIND_PROVIDERS',
    GET_CLOSEST_PEERS = 'GET_CLOSEST_PEERS',
    GET_PUBLIC_KEY = 'GET_PUBLIC_KEY',
    GET_VALUE = 'GET_VALUE',
    SEARCH_VALUE = 'SEARCH_VALUE',
    PUT_VALUE = 'PUT_VALUE',
    PROVIDE = 'PROVIDE'
  }

  enum __TypeValues {
    FIND_PEER = 0,
    FIND_PEERS_CONNECTED_TO_PEER = 1,
    FIND_PROVIDERS = 2,
    GET_CLOSEST_PEERS = 3,
    GET_PUBLIC_KEY = 4,
    GET_VALUE = 5,
    SEARCH_VALUE = 6,
    PUT_VALUE = 7,
    PROVIDE = 8
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<DHTRequest>

  export const codec = (): Codec<DHTRequest> => {
    if (_codec == null) {
      _codec = message<DHTRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          DHTRequest.Type.codec().encode(obj.type, w)
        }

        if (obj.peer != null) {
          w.uint32(18)
          w.bytes(obj.peer)
        }

        if (obj.cid != null) {
          w.uint32(26)
          w.bytes(obj.cid)
        }

        if (obj.key != null) {
          w.uint32(34)
          w.bytes(obj.key)
        }

        if (obj.value != null) {
          w.uint32(42)
          w.bytes(obj.value)
        }

        if (obj.count != null) {
          w.uint32(48)
          w.int32(obj.count)
        }

        if (obj.timeout != null) {
          w.uint32(56)
          w.int64(obj.timeout)
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
              obj.type = DHTRequest.Type.codec().decode(reader)
              break
            case 2:
              obj.peer = reader.bytes()
              break
            case 3:
              obj.cid = reader.bytes()
              break
            case 4:
              obj.key = reader.bytes()
              break
            case 5:
              obj.value = reader.bytes()
              break
            case 6:
              obj.count = reader.int32()
              break
            case 7:
              obj.timeout = reader.int64()
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

  export const encode = (obj: Partial<DHTRequest>): Uint8Array => {
    return encodeMessage(obj, DHTRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): DHTRequest => {
    return decodeMessage(buf, DHTRequest.codec())
  }
}

export interface DHTResponse {
  type?: DHTResponse.Type
  peer?: PeerInfo
  value?: Uint8Array
}

export namespace DHTResponse {
  export enum Type {
    BEGIN = 'BEGIN',
    VALUE = 'VALUE',
    END = 'END'
  }

  enum __TypeValues {
    BEGIN = 0,
    VALUE = 1,
    END = 2
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<DHTResponse>

  export const codec = (): Codec<DHTResponse> => {
    if (_codec == null) {
      _codec = message<DHTResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          DHTResponse.Type.codec().encode(obj.type, w)
        }

        if (obj.peer != null) {
          w.uint32(18)
          PeerInfo.codec().encode(obj.peer, w)
        }

        if (obj.value != null) {
          w.uint32(26)
          w.bytes(obj.value)
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
              obj.type = DHTResponse.Type.codec().decode(reader)
              break
            case 2:
              obj.peer = PeerInfo.codec().decode(reader, reader.uint32())
              break
            case 3:
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

  export const encode = (obj: Partial<DHTResponse>): Uint8Array => {
    return encodeMessage(obj, DHTResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): DHTResponse => {
    return decodeMessage(buf, DHTResponse.codec())
  }
}

export interface PeerInfo {
  id: Uint8Array
  addrs: Uint8Array[]
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

  export const encode = (obj: Partial<PeerInfo>): Uint8Array => {
    return encodeMessage(obj, PeerInfo.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerInfo => {
    return decodeMessage(buf, PeerInfo.codec())
  }
}

export interface ConnManagerRequest {
  type?: ConnManagerRequest.Type
  peer?: Uint8Array
  tag?: string
  weight?: bigint
}

export namespace ConnManagerRequest {
  export enum Type {
    TAG_PEER = 'TAG_PEER',
    UNTAG_PEER = 'UNTAG_PEER',
    TRIM = 'TRIM'
  }

  enum __TypeValues {
    TAG_PEER = 0,
    UNTAG_PEER = 1,
    TRIM = 2
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<ConnManagerRequest>

  export const codec = (): Codec<ConnManagerRequest> => {
    if (_codec == null) {
      _codec = message<ConnManagerRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          ConnManagerRequest.Type.codec().encode(obj.type, w)
        }

        if (obj.peer != null) {
          w.uint32(18)
          w.bytes(obj.peer)
        }

        if (obj.tag != null) {
          w.uint32(26)
          w.string(obj.tag)
        }

        if (obj.weight != null) {
          w.uint32(32)
          w.int64(obj.weight)
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
              obj.type = ConnManagerRequest.Type.codec().decode(reader)
              break
            case 2:
              obj.peer = reader.bytes()
              break
            case 3:
              obj.tag = reader.string()
              break
            case 4:
              obj.weight = reader.int64()
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

  export const encode = (obj: Partial<ConnManagerRequest>): Uint8Array => {
    return encodeMessage(obj, ConnManagerRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): ConnManagerRequest => {
    return decodeMessage(buf, ConnManagerRequest.codec())
  }
}

export interface DisconnectRequest {
  peer: Uint8Array
}

export namespace DisconnectRequest {
  let _codec: Codec<DisconnectRequest>

  export const codec = (): Codec<DisconnectRequest> => {
    if (_codec == null) {
      _codec = message<DisconnectRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          peer: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peer = reader.bytes()
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

  export const encode = (obj: Partial<DisconnectRequest>): Uint8Array => {
    return encodeMessage(obj, DisconnectRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): DisconnectRequest => {
    return decodeMessage(buf, DisconnectRequest.codec())
  }
}

export interface PSRequest {
  type?: PSRequest.Type
  topic?: string
  data?: Uint8Array
}

export namespace PSRequest {
  export enum Type {
    GET_TOPICS = 'GET_TOPICS',
    LIST_PEERS = 'LIST_PEERS',
    PUBLISH = 'PUBLISH',
    SUBSCRIBE = 'SUBSCRIBE'
  }

  enum __TypeValues {
    GET_TOPICS = 0,
    LIST_PEERS = 1,
    PUBLISH = 2,
    SUBSCRIBE = 3
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<PSRequest>

  export const codec = (): Codec<PSRequest> => {
    if (_codec == null) {
      _codec = message<PSRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          PSRequest.Type.codec().encode(obj.type, w)
        }

        if (obj.topic != null) {
          w.uint32(18)
          w.string(obj.topic)
        }

        if (obj.data != null) {
          w.uint32(26)
          w.bytes(obj.data)
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
              obj.type = PSRequest.Type.codec().decode(reader)
              break
            case 2:
              obj.topic = reader.string()
              break
            case 3:
              obj.data = reader.bytes()
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

  export const encode = (obj: Partial<PSRequest>): Uint8Array => {
    return encodeMessage(obj, PSRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PSRequest => {
    return decodeMessage(buf, PSRequest.codec())
  }
}

export interface PSMessage {
  from?: Uint8Array
  data?: Uint8Array
  seqno?: Uint8Array
  topicIDs: string[]
  signature?: Uint8Array
  key?: Uint8Array
}

export namespace PSMessage {
  let _codec: Codec<PSMessage>

  export const codec = (): Codec<PSMessage> => {
    if (_codec == null) {
      _codec = message<PSMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.from != null) {
          w.uint32(10)
          w.bytes(obj.from)
        }

        if (obj.data != null) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (obj.seqno != null) {
          w.uint32(26)
          w.bytes(obj.seqno)
        }

        if (obj.topicIDs != null) {
          for (const value of obj.topicIDs) {
            w.uint32(34)
            w.string(value)
          }
        }

        if (obj.signature != null) {
          w.uint32(42)
          w.bytes(obj.signature)
        }

        if (obj.key != null) {
          w.uint32(50)
          w.bytes(obj.key)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          topicIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.from = reader.bytes()
              break
            case 2:
              obj.data = reader.bytes()
              break
            case 3:
              obj.seqno = reader.bytes()
              break
            case 4:
              obj.topicIDs.push(reader.string())
              break
            case 5:
              obj.signature = reader.bytes()
              break
            case 6:
              obj.key = reader.bytes()
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

  export const encode = (obj: Partial<PSMessage>): Uint8Array => {
    return encodeMessage(obj, PSMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PSMessage => {
    return decodeMessage(buf, PSMessage.codec())
  }
}

export interface PSResponse {
  topics: string[]
  peerIDs: Uint8Array[]
}

export namespace PSResponse {
  let _codec: Codec<PSResponse>

  export const codec = (): Codec<PSResponse> => {
    if (_codec == null) {
      _codec = message<PSResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.topics != null) {
          for (const value of obj.topics) {
            w.uint32(10)
            w.string(value)
          }
        }

        if (obj.peerIDs != null) {
          for (const value of obj.peerIDs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          topics: [],
          peerIDs: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.topics.push(reader.string())
              break
            case 2:
              obj.peerIDs.push(reader.bytes())
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

  export const encode = (obj: Partial<PSResponse>): Uint8Array => {
    return encodeMessage(obj, PSResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PSResponse => {
    return decodeMessage(buf, PSResponse.codec())
  }
}

export interface PeerstoreRequest {
  type?: PeerstoreRequest.Type
  id?: Uint8Array
  protos: string[]
}

export namespace PeerstoreRequest {
  export enum Type {
    UNSPECIFIED = 'UNSPECIFIED',
    GET_PROTOCOLS = 'GET_PROTOCOLS',
    GET_PEER_INFO = 'GET_PEER_INFO'
  }

  enum __TypeValues {
    UNSPECIFIED = 0,
    GET_PROTOCOLS = 1,
    GET_PEER_INFO = 2
  }

  export namespace Type {
    export const codec = (): Codec<Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<PeerstoreRequest>

  export const codec = (): Codec<PeerstoreRequest> => {
    if (_codec == null) {
      _codec = message<PeerstoreRequest>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.type != null) {
          w.uint32(8)
          PeerstoreRequest.Type.codec().encode(obj.type, w)
        }

        if (obj.id != null) {
          w.uint32(18)
          w.bytes(obj.id)
        }

        if (obj.protos != null) {
          for (const value of obj.protos) {
            w.uint32(26)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          protos: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = PeerstoreRequest.Type.codec().decode(reader)
              break
            case 2:
              obj.id = reader.bytes()
              break
            case 3:
              obj.protos.push(reader.string())
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

  export const encode = (obj: Partial<PeerstoreRequest>): Uint8Array => {
    return encodeMessage(obj, PeerstoreRequest.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerstoreRequest => {
    return decodeMessage(buf, PeerstoreRequest.codec())
  }
}

export interface PeerstoreResponse {
  peer?: PeerInfo
  protos: string[]
}

export namespace PeerstoreResponse {
  let _codec: Codec<PeerstoreResponse>

  export const codec = (): Codec<PeerstoreResponse> => {
    if (_codec == null) {
      _codec = message<PeerstoreResponse>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.peer != null) {
          w.uint32(10)
          PeerInfo.codec().encode(obj.peer, w)
        }

        if (obj.protos != null) {
          for (const value of obj.protos) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          protos: []
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.peer = PeerInfo.codec().decode(reader, reader.uint32())
              break
            case 2:
              obj.protos.push(reader.string())
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

  export const encode = (obj: Partial<PeerstoreResponse>): Uint8Array => {
    return encodeMessage(obj, PeerstoreResponse.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): PeerstoreResponse => {
    return decodeMessage(buf, PeerstoreResponse.codec())
  }
}
