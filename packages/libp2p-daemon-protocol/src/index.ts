import { decodeMessage, encodeMessage, enumeration, MaxLengthError, message, streamMessage } from 'protons-runtime'
import { alloc as uint8ArrayAlloc } from 'uint8arrays/alloc'
import type { Codec, DecodeOptions } from 'protons-runtime'
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

export interface RequestInput {
  type?: Request.Type
  connect?: ConnectRequestInput
  streamOpen?: StreamOpenRequestInput
  streamHandler?: StreamHandlerRequestInput
  dht?: DHTRequestInput
  connManager?: ConnManagerRequestInput
  disconnect?: DisconnectRequestInput
  pubsub?: PSRequestInput
  peerStore?: PeerstoreRequestInput
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<Request, RequestInput>

  export const codec = (): Codec<Request, RequestInput> => {
    if (_codec == null) {
      _codec = message<Request, RequestInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = Request.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.connect = ConnectRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.connect
              })
              break
            }
            case 3: {
              obj.streamOpen = StreamOpenRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.streamOpen
              })
              break
            }
            case 4: {
              obj.streamHandler = StreamHandlerRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.streamHandler
              })
              break
            }
            case 5: {
              obj.dht = DHTRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dht
              })
              break
            }
            case 6: {
              obj.connManager = ConnManagerRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.connManager
              })
              break
            }
            case 7: {
              obj.disconnect = DisconnectRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.disconnect
              })
              break
            }
            case 8: {
              obj.pubsub = PSRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.pubsub
              })
              break
            }
            case 9: {
              obj.peerStore = PeerstoreRequest.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peerStore
              })
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Request'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: Request.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * ConnectRequest.codec().stream(r, r.uint32(), `${prefix}connect.`, {
                limits: opts.limits?.connect
              })

              break
            }
            case 3: {
              yield * StreamOpenRequest.codec().stream(r, r.uint32(), `${prefix}streamOpen.`, {
                limits: opts.limits?.streamOpen
              })

              break
            }
            case 4: {
              yield * StreamHandlerRequest.codec().stream(r, r.uint32(), `${prefix}streamHandler.`, {
                limits: opts.limits?.streamHandler
              })

              break
            }
            case 5: {
              yield * DHTRequest.codec().stream(r, r.uint32(), `${prefix}dht.`, {
                limits: opts.limits?.dht
              })

              break
            }
            case 6: {
              yield * ConnManagerRequest.codec().stream(r, r.uint32(), `${prefix}connManager.`, {
                limits: opts.limits?.connManager
              })

              break
            }
            case 7: {
              yield * DisconnectRequest.codec().stream(r, r.uint32(), `${prefix}disconnect.`, {
                limits: opts.limits?.disconnect
              })

              break
            }
            case 8: {
              yield * PSRequest.codec().stream(r, r.uint32(), `${prefix}pubsub.`, {
                limits: opts.limits?.pubsub
              })

              break
            }
            case 9: {
              yield * PeerstoreRequest.codec().stream(r, r.uint32(), `${prefix}peerStore.`, {
                limits: opts.limits?.peerStore
              })

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Request'
          }
        }
      })
    }

    return _codec
  }

  export interface RequestTypeFieldEvent {
    field: '.type'
    value: Request.Type
  }

  export interface RequestConnectMessageStart {
    field: '.connect'
    type: 'start'
  }

  export interface RequestConnectMessageEnd {
    field: '.connect'
    type: 'end'
  }

  export interface RequestConnectPeerFieldEvent {
    field: '.connect.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestConnectAddrsFieldEvent {
    field: '.connect.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestConnectTimeoutFieldEvent {
    field: '.connect.timeout'
    value: bigint
  }

  export interface RequestStreamOpenMessageStart {
    field: '.streamOpen'
    type: 'start'
  }

  export interface RequestStreamOpenMessageEnd {
    field: '.streamOpen'
    type: 'end'
  }

  export interface RequestStreamOpenPeerFieldEvent {
    field: '.streamOpen.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestStreamOpenProtoFieldEvent {
    field: '.streamOpen.proto[]'
    index: number
    value: string
  }

  export interface RequestStreamOpenTimeoutFieldEvent {
    field: '.streamOpen.timeout'
    value: bigint
  }

  export interface RequestStreamHandlerMessageStart {
    field: '.streamHandler'
    type: 'start'
  }

  export interface RequestStreamHandlerMessageEnd {
    field: '.streamHandler'
    type: 'end'
  }

  export interface RequestStreamHandlerAddrFieldEvent {
    field: '.streamHandler.addr'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestStreamHandlerProtoFieldEvent {
    field: '.streamHandler.proto[]'
    index: number
    value: string
  }

  export interface RequestDhtMessageStart {
    field: '.dht'
    type: 'start'
  }

  export interface RequestDhtMessageEnd {
    field: '.dht'
    type: 'end'
  }

  export interface RequestDhtTypeFieldEvent {
    field: '.dht.type'
    value: DHTRequest.Type
  }

  export interface RequestDhtPeerFieldEvent {
    field: '.dht.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestDhtCidFieldEvent {
    field: '.dht.cid'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestDhtKeyFieldEvent {
    field: '.dht.key'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestDhtValueFieldEvent {
    field: '.dht.value'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestDhtCountFieldEvent {
    field: '.dht.count'
    value: number
  }

  export interface RequestDhtTimeoutFieldEvent {
    field: '.dht.timeout'
    value: bigint
  }

  export interface RequestConnManagerMessageStart {
    field: '.connManager'
    type: 'start'
  }

  export interface RequestConnManagerMessageEnd {
    field: '.connManager'
    type: 'end'
  }

  export interface RequestConnManagerTypeFieldEvent {
    field: '.connManager.type'
    value: ConnManagerRequest.Type
  }

  export interface RequestConnManagerPeerFieldEvent {
    field: '.connManager.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestConnManagerTagFieldEvent {
    field: '.connManager.tag'
    value: string
  }

  export interface RequestConnManagerWeightFieldEvent {
    field: '.connManager.weight'
    value: bigint
  }

  export interface RequestDisconnectMessageStart {
    field: '.disconnect'
    type: 'start'
  }

  export interface RequestDisconnectMessageEnd {
    field: '.disconnect'
    type: 'end'
  }

  export interface RequestDisconnectPeerFieldEvent {
    field: '.disconnect.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestPubsubMessageStart {
    field: '.pubsub'
    type: 'start'
  }

  export interface RequestPubsubMessageEnd {
    field: '.pubsub'
    type: 'end'
  }

  export interface RequestPubsubTypeFieldEvent {
    field: '.pubsub.type'
    value: PSRequest.Type
  }

  export interface RequestPubsubTopicFieldEvent {
    field: '.pubsub.topic'
    value: string
  }

  export interface RequestPubsubDataFieldEvent {
    field: '.pubsub.data'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestPeerStoreMessageStart {
    field: '.peerStore'
    type: 'start'
  }

  export interface RequestPeerStoreMessageEnd {
    field: '.peerStore'
    type: 'end'
  }

  export interface RequestPeerStoreTypeFieldEvent {
    field: '.peerStore.type'
    value: PeerstoreRequest.Type
  }

  export interface RequestPeerStoreIdFieldEvent {
    field: '.peerStore.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface RequestPeerStoreProtosFieldEvent {
    field: '.peerStore.protos[]'
    index: number
    value: string
  }

  export function encode (obj: RequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Request.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Request>): Request {
    return decodeMessage(buf, Request.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Request>): Generator<RequestTypeFieldEvent | RequestConnectMessageStart | RequestConnectMessageEnd | RequestConnectPeerFieldEvent | RequestConnectAddrsFieldEvent | RequestConnectTimeoutFieldEvent | RequestStreamOpenMessageStart | RequestStreamOpenMessageEnd | RequestStreamOpenPeerFieldEvent | RequestStreamOpenProtoFieldEvent | RequestStreamOpenTimeoutFieldEvent | RequestStreamHandlerMessageStart | RequestStreamHandlerMessageEnd | RequestStreamHandlerAddrFieldEvent | RequestStreamHandlerProtoFieldEvent | RequestDhtMessageStart | RequestDhtMessageEnd | RequestDhtTypeFieldEvent | RequestDhtPeerFieldEvent | RequestDhtCidFieldEvent | RequestDhtKeyFieldEvent | RequestDhtValueFieldEvent | RequestDhtCountFieldEvent | RequestDhtTimeoutFieldEvent | RequestConnManagerMessageStart | RequestConnManagerMessageEnd | RequestConnManagerTypeFieldEvent | RequestConnManagerPeerFieldEvent | RequestConnManagerTagFieldEvent | RequestConnManagerWeightFieldEvent | RequestDisconnectMessageStart | RequestDisconnectMessageEnd | RequestDisconnectPeerFieldEvent | RequestPubsubMessageStart | RequestPubsubMessageEnd | RequestPubsubTypeFieldEvent | RequestPubsubTopicFieldEvent | RequestPubsubDataFieldEvent | RequestPeerStoreMessageStart | RequestPeerStoreMessageEnd | RequestPeerStoreTypeFieldEvent | RequestPeerStoreIdFieldEvent | RequestPeerStoreProtosFieldEvent> {
    return streamMessage(buf, Request.codec(), opts)
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

export interface ResponseInput {
  type?: Response.Type
  error?: ErrorResponseInput
  streamInfo?: StreamInfoInput
  identify?: IdentifyResponseInput
  dht?: DHTResponseInput
  peers?: PeerInfoInput[]
  pubsub?: PSResponseInput
  peerStore?: PeerstoreResponseInput
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<Response, ResponseInput>

  export const codec = (): Codec<Response, ResponseInput> => {
    if (_codec == null) {
      _codec = message<Response, ResponseInput>((obj, w, opts = {}) => {
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

        if (obj.peers != null && obj.peers.length > 0) {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          peers: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = Response.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.error = ErrorResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.error
              })
              break
            }
            case 3: {
              obj.streamInfo = StreamInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.streamInfo
              })
              break
            }
            case 4: {
              obj.identify = IdentifyResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.identify
              })
              break
            }
            case 5: {
              obj.dht = DHTResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.dht
              })
              break
            }
            case 6: {
              if (opts.limits?.peers != null && obj.peers.length === opts.limits.peers) {
                throw new MaxLengthError('Decode error - repeated field "peers" had too many elements')
              }

              obj.peers.push(PeerInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peers$
              }))
              break
            }
            case 7: {
              obj.pubsub = PSResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.pubsub
              })
              break
            }
            case 8: {
              obj.peerStore = PeerstoreResponse.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peerStore
              })
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          peers: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'Response'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: Response.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * ErrorResponse.codec().stream(r, r.uint32(), `${prefix}error.`, {
                limits: opts.limits?.error
              })

              break
            }
            case 3: {
              yield * StreamInfo.codec().stream(r, r.uint32(), `${prefix}streamInfo.`, {
                limits: opts.limits?.streamInfo
              })

              break
            }
            case 4: {
              yield * IdentifyResponse.codec().stream(r, r.uint32(), `${prefix}identify.`, {
                limits: opts.limits?.identify
              })

              break
            }
            case 5: {
              yield * DHTResponse.codec().stream(r, r.uint32(), `${prefix}dht.`, {
                limits: opts.limits?.dht
              })

              break
            }
            case 6: {
              if (opts.limits?.peers != null && obj.peers === opts.limits.peers) {
                throw new MaxLengthError('Streaming decode error - repeated field "peers" had too many elements')
              }

              for (const evt of PeerInfo.codec().stream(r, r.uint32(), `${prefix}peers[].`, {
                limits: opts.limits?.peers$
              })) {
                yield {
                  ...evt,
                  index: obj.peers
                }
              }

              obj.peers++

              break
            }
            case 7: {
              yield * PSResponse.codec().stream(r, r.uint32(), `${prefix}pubsub.`, {
                limits: opts.limits?.pubsub
              })

              break
            }
            case 8: {
              yield * PeerstoreResponse.codec().stream(r, r.uint32(), `${prefix}peerStore.`, {
                limits: opts.limits?.peerStore
              })

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'Response'
          }
        }
      })
    }

    return _codec
  }

  export interface ResponseTypeFieldEvent {
    field: '.type'
    value: Response.Type
  }

  export interface ResponseErrorMessageStart {
    field: '.error'
    type: 'start'
  }

  export interface ResponseErrorMessageEnd {
    field: '.error'
    type: 'end'
  }

  export interface ResponseErrorMsgFieldEvent {
    field: '.error.msg'
    value: string
  }

  export interface ResponseStreamInfoMessageStart {
    field: '.streamInfo'
    type: 'start'
  }

  export interface ResponseStreamInfoMessageEnd {
    field: '.streamInfo'
    type: 'end'
  }

  export interface ResponseStreamInfoPeerFieldEvent {
    field: '.streamInfo.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseStreamInfoAddrFieldEvent {
    field: '.streamInfo.addr'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseStreamInfoProtoFieldEvent {
    field: '.streamInfo.proto'
    value: string
  }

  export interface ResponseIdentifyMessageStart {
    field: '.identify'
    type: 'start'
  }

  export interface ResponseIdentifyMessageEnd {
    field: '.identify'
    type: 'end'
  }

  export interface ResponseIdentifyIdFieldEvent {
    field: '.identify.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseIdentifyAddrsFieldEvent {
    field: '.identify.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseDhtMessageStart {
    field: '.dht'
    type: 'start'
  }

  export interface ResponseDhtMessageEnd {
    field: '.dht'
    type: 'end'
  }

  export interface ResponseDhtTypeFieldEvent {
    field: '.dht.type'
    value: DHTResponse.Type
  }

  export interface ResponseDhtPeerMessageStart {
    field: '.dht.peer'
    type: 'start'
  }

  export interface ResponseDhtPeerMessageEnd {
    field: '.dht.peer'
    type: 'end'
  }

  export interface ResponseDhtPeerIdFieldEvent {
    field: '.dht.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseDhtPeerAddrsFieldEvent {
    field: '.dht.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponseDhtValueFieldEvent {
    field: '.dht.value'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponsePeersIdFieldEvent {
    field: '.peers[].id'
    value: Uint8Array<ArrayBuffer>
    index: number
  }

  export interface ResponsePeersAddrsFieldEvent {
    field: '.peers[].addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponsePeersMessageStartEvent {
    field: '.peers[]'
    index: number
    type: 'start'
    message: string
  }

  export interface ResponsePeersMessageEndEvent {
    field: '.peers[]'
    index: number
    type: 'end'
    message: string
  }

  export interface ResponsePubsubMessageStart {
    field: '.pubsub'
    type: 'start'
  }

  export interface ResponsePubsubMessageEnd {
    field: '.pubsub'
    type: 'end'
  }

  export interface ResponsePubsubTopicsFieldEvent {
    field: '.pubsub.topics[]'
    index: number
    value: string
  }

  export interface ResponsePubsubPeerIDsFieldEvent {
    field: '.pubsub.peerIDs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponsePeerStoreMessageStart {
    field: '.peerStore'
    type: 'start'
  }

  export interface ResponsePeerStoreMessageEnd {
    field: '.peerStore'
    type: 'end'
  }

  export interface ResponsePeerStorePeerMessageStart {
    field: '.peerStore.peer'
    type: 'start'
  }

  export interface ResponsePeerStorePeerMessageEnd {
    field: '.peerStore.peer'
    type: 'end'
  }

  export interface ResponsePeerStorePeerIdFieldEvent {
    field: '.peerStore.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponsePeerStorePeerAddrsFieldEvent {
    field: '.peerStore.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ResponsePeerStoreProtosFieldEvent {
    field: '.peerStore.protos[]'
    index: number
    value: string
  }

  export function encode (obj: ResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, Response.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Response>): Response {
    return decodeMessage(buf, Response.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<Response>): Generator<ResponseTypeFieldEvent | ResponseErrorMessageStart | ResponseErrorMessageEnd | ResponseErrorMsgFieldEvent | ResponseStreamInfoMessageStart | ResponseStreamInfoMessageEnd | ResponseStreamInfoPeerFieldEvent | ResponseStreamInfoAddrFieldEvent | ResponseStreamInfoProtoFieldEvent | ResponseIdentifyMessageStart | ResponseIdentifyMessageEnd | ResponseIdentifyIdFieldEvent | ResponseIdentifyAddrsFieldEvent | ResponseDhtMessageStart | ResponseDhtMessageEnd | ResponseDhtTypeFieldEvent | ResponseDhtPeerMessageStart | ResponseDhtPeerMessageEnd | ResponseDhtPeerIdFieldEvent | ResponseDhtPeerAddrsFieldEvent | ResponseDhtValueFieldEvent | ResponsePeersIdFieldEvent | ResponsePeersAddrsFieldEvent | ResponsePeersMessageStartEvent | ResponsePeersMessageEndEvent | ResponsePubsubMessageStart | ResponsePubsubMessageEnd | ResponsePubsubTopicsFieldEvent | ResponsePubsubPeerIDsFieldEvent | ResponsePeerStoreMessageStart | ResponsePeerStoreMessageEnd | ResponsePeerStorePeerMessageStart | ResponsePeerStorePeerMessageEnd | ResponsePeerStorePeerIdFieldEvent | ResponsePeerStorePeerAddrsFieldEvent | ResponsePeerStoreProtosFieldEvent> {
    return streamMessage(buf, Response.codec(), opts)
  }
}

export interface IdentifyResponse {
  id: Uint8Array<ArrayBuffer>
  addrs: Uint8Array<ArrayBuffer>[]
}

export interface IdentifyResponseInput {
  id?: Uint8Array
  addrs?: Uint8Array[]
}

export namespace IdentifyResponse {
  let _codec: Codec<IdentifyResponse, IdentifyResponseInput>

  export const codec = (): Codec<IdentifyResponse, IdentifyResponseInput> => {
    if (_codec == null) {
      _codec = message<IdentifyResponse, IdentifyResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          addrs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.id = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'IdentifyResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}id`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}addrs[]`,
                index: obj.addrs,
                value: r.bytes()
              }

              obj.addrs++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'IdentifyResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface IdentifyResponseIdFieldEvent {
    field: '.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface IdentifyResponseAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: IdentifyResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, IdentifyResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<IdentifyResponse>): IdentifyResponse {
    return decodeMessage(buf, IdentifyResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<IdentifyResponse>): Generator<IdentifyResponseIdFieldEvent | IdentifyResponseAddrsFieldEvent> {
    return streamMessage(buf, IdentifyResponse.codec(), opts)
  }
}

export interface ConnectRequest {
  peer: Uint8Array<ArrayBuffer>
  addrs: Uint8Array<ArrayBuffer>[]
  timeout?: bigint
}

export interface ConnectRequestInput {
  peer?: Uint8Array
  addrs?: Uint8Array[]
  timeout?: bigint
}

export namespace ConnectRequest {
  let _codec: Codec<ConnectRequest, ConnectRequestInput>

  export const codec = (): Codec<ConnectRequest, ConnectRequestInput> => {
    if (_codec == null) {
      _codec = message<ConnectRequest, ConnectRequestInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          peer: uint8ArrayAlloc(0),
          addrs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peer = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            case 3: {
              obj.timeout = r.int64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'ConnectRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}addrs[]`,
                index: obj.addrs,
                value: r.bytes()
              }

              obj.addrs++

              break
            }
            case 3: {
              yield {
                field: `${prefix}timeout`,
                value: r.int64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'ConnectRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface ConnectRequestPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ConnectRequestAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface ConnectRequestTimeoutFieldEvent {
    field: '.timeout'
    value: bigint
  }

  export function encode (obj: ConnectRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, ConnectRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnectRequest>): ConnectRequest {
    return decodeMessage(buf, ConnectRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnectRequest>): Generator<ConnectRequestPeerFieldEvent | ConnectRequestAddrsFieldEvent | ConnectRequestTimeoutFieldEvent> {
    return streamMessage(buf, ConnectRequest.codec(), opts)
  }
}

export interface StreamOpenRequest {
  peer: Uint8Array<ArrayBuffer>
  proto: string[]
  timeout?: bigint
}

export interface StreamOpenRequestInput {
  peer?: Uint8Array
  proto?: string[]
  timeout?: bigint
}

export namespace StreamOpenRequest {
  let _codec: Codec<StreamOpenRequest, StreamOpenRequestInput>

  export const codec = (): Codec<StreamOpenRequest, StreamOpenRequestInput> => {
    if (_codec == null) {
      _codec = message<StreamOpenRequest, StreamOpenRequestInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.peer != null && obj.peer.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.peer)
        }

        if (obj.proto != null && obj.proto.length > 0) {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          peer: uint8ArrayAlloc(0),
          proto: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peer = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.proto != null && obj.proto.length === opts.limits.proto) {
                throw new MaxLengthError('Decode error - repeated field "proto" had too many elements')
              }

              obj.proto.push(r.string())
              break
            }
            case 3: {
              obj.timeout = r.int64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          proto: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'StreamOpenRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.proto != null && obj.proto === opts.limits.proto) {
                throw new MaxLengthError('Streaming decode error - repeated field "proto" had too many elements')
              }

              yield {
                field: `${prefix}proto[]`,
                index: obj.proto,
                value: r.string()
              }

              obj.proto++

              break
            }
            case 3: {
              yield {
                field: `${prefix}timeout`,
                value: r.int64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'StreamOpenRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface StreamOpenRequestPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface StreamOpenRequestProtoFieldEvent {
    field: '.proto[]'
    index: number
    value: string
  }

  export interface StreamOpenRequestTimeoutFieldEvent {
    field: '.timeout'
    value: bigint
  }

  export function encode (obj: StreamOpenRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, StreamOpenRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamOpenRequest>): StreamOpenRequest {
    return decodeMessage(buf, StreamOpenRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamOpenRequest>): Generator<StreamOpenRequestPeerFieldEvent | StreamOpenRequestProtoFieldEvent | StreamOpenRequestTimeoutFieldEvent> {
    return streamMessage(buf, StreamOpenRequest.codec(), opts)
  }
}

export interface StreamHandlerRequest {
  addr: Uint8Array<ArrayBuffer>
  proto: string[]
}

export interface StreamHandlerRequestInput {
  addr?: Uint8Array
  proto?: string[]
}

export namespace StreamHandlerRequest {
  let _codec: Codec<StreamHandlerRequest, StreamHandlerRequestInput>

  export const codec = (): Codec<StreamHandlerRequest, StreamHandlerRequestInput> => {
    if (_codec == null) {
      _codec = message<StreamHandlerRequest, StreamHandlerRequestInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.addr != null && obj.addr.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.addr)
        }

        if (obj.proto != null && obj.proto.length > 0) {
          for (const value of obj.proto) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          addr: uint8ArrayAlloc(0),
          proto: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.addr = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.proto != null && obj.proto.length === opts.limits.proto) {
                throw new MaxLengthError('Decode error - repeated field "proto" had too many elements')
              }

              obj.proto.push(r.string())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          proto: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'StreamHandlerRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}addr`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.proto != null && obj.proto === opts.limits.proto) {
                throw new MaxLengthError('Streaming decode error - repeated field "proto" had too many elements')
              }

              yield {
                field: `${prefix}proto[]`,
                index: obj.proto,
                value: r.string()
              }

              obj.proto++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'StreamHandlerRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface StreamHandlerRequestAddrFieldEvent {
    field: '.addr'
    value: Uint8Array<ArrayBuffer>
  }

  export interface StreamHandlerRequestProtoFieldEvent {
    field: '.proto[]'
    index: number
    value: string
  }

  export function encode (obj: StreamHandlerRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, StreamHandlerRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamHandlerRequest>): StreamHandlerRequest {
    return decodeMessage(buf, StreamHandlerRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamHandlerRequest>): Generator<StreamHandlerRequestAddrFieldEvent | StreamHandlerRequestProtoFieldEvent> {
    return streamMessage(buf, StreamHandlerRequest.codec(), opts)
  }
}

export interface ErrorResponse {
  msg: string
}

export interface ErrorResponseInput {
  msg?: string
}

export namespace ErrorResponse {
  let _codec: Codec<ErrorResponse, ErrorResponseInput>

  export const codec = (): Codec<ErrorResponse, ErrorResponseInput> => {
    if (_codec == null) {
      _codec = message<ErrorResponse, ErrorResponseInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {
          msg: ''
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.msg = r.string()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'ErrorResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}msg`,
                value: r.string()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'ErrorResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface ErrorResponseMsgFieldEvent {
    field: '.msg'
    value: string
  }

  export function encode (obj: ErrorResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, ErrorResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ErrorResponse>): ErrorResponse {
    return decodeMessage(buf, ErrorResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ErrorResponse>): Generator<ErrorResponseMsgFieldEvent> {
    return streamMessage(buf, ErrorResponse.codec(), opts)
  }
}

export interface StreamInfo {
  peer: Uint8Array<ArrayBuffer>
  addr: Uint8Array<ArrayBuffer>
  proto: string
}

export interface StreamInfoInput {
  peer?: Uint8Array
  addr?: Uint8Array
  proto?: string
}

export namespace StreamInfo {
  let _codec: Codec<StreamInfo, StreamInfoInput>

  export const codec = (): Codec<StreamInfo, StreamInfoInput> => {
    if (_codec == null) {
      _codec = message<StreamInfo, StreamInfoInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {
          peer: uint8ArrayAlloc(0),
          addr: uint8ArrayAlloc(0),
          proto: ''
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peer = r.bytes()
              break
            }
            case 2: {
              obj.addr = r.bytes()
              break
            }
            case 3: {
              obj.proto = r.string()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'StreamInfo'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}addr`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}proto`,
                value: r.string()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'StreamInfo'
          }
        }
      })
    }

    return _codec
  }

  export interface StreamInfoPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface StreamInfoAddrFieldEvent {
    field: '.addr'
    value: Uint8Array<ArrayBuffer>
  }

  export interface StreamInfoProtoFieldEvent {
    field: '.proto'
    value: string
  }

  export function encode (obj: StreamInfoInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, StreamInfo.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamInfo>): StreamInfo {
    return decodeMessage(buf, StreamInfo.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<StreamInfo>): Generator<StreamInfoPeerFieldEvent | StreamInfoAddrFieldEvent | StreamInfoProtoFieldEvent> {
    return streamMessage(buf, StreamInfo.codec(), opts)
  }
}

export interface DHTRequest {
  type?: DHTRequest.Type
  peer?: Uint8Array<ArrayBuffer>
  cid?: Uint8Array<ArrayBuffer>
  key?: Uint8Array<ArrayBuffer>
  value?: Uint8Array<ArrayBuffer>
  count?: number
  timeout?: bigint
}

export interface DHTRequestInput {
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<DHTRequest, DHTRequestInput>

  export const codec = (): Codec<DHTRequest, DHTRequestInput> => {
    if (_codec == null) {
      _codec = message<DHTRequest, DHTRequestInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = DHTRequest.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.peer = r.bytes()
              break
            }
            case 3: {
              obj.cid = r.bytes()
              break
            }
            case 4: {
              obj.key = r.bytes()
              break
            }
            case 5: {
              obj.value = r.bytes()
              break
            }
            case 6: {
              obj.count = r.int32()
              break
            }
            case 7: {
              obj.timeout = r.int64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'DHTRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: DHTRequest.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}cid`,
                value: r.bytes()
              }
              break
            }
            case 4: {
              yield {
                field: `${prefix}key`,
                value: r.bytes()
              }
              break
            }
            case 5: {
              yield {
                field: `${prefix}value`,
                value: r.bytes()
              }
              break
            }
            case 6: {
              yield {
                field: `${prefix}count`,
                value: r.int32()
              }
              break
            }
            case 7: {
              yield {
                field: `${prefix}timeout`,
                value: r.int64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'DHTRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface DHTRequestTypeFieldEvent {
    field: '.type'
    value: DHTRequest.Type
  }

  export interface DHTRequestPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTRequestCidFieldEvent {
    field: '.cid'
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTRequestKeyFieldEvent {
    field: '.key'
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTRequestValueFieldEvent {
    field: '.value'
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTRequestCountFieldEvent {
    field: '.count'
    value: number
  }

  export interface DHTRequestTimeoutFieldEvent {
    field: '.timeout'
    value: bigint
  }

  export function encode (obj: DHTRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DHTRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DHTRequest>): DHTRequest {
    return decodeMessage(buf, DHTRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DHTRequest>): Generator<DHTRequestTypeFieldEvent | DHTRequestPeerFieldEvent | DHTRequestCidFieldEvent | DHTRequestKeyFieldEvent | DHTRequestValueFieldEvent | DHTRequestCountFieldEvent | DHTRequestTimeoutFieldEvent> {
    return streamMessage(buf, DHTRequest.codec(), opts)
  }
}

export interface DHTResponse {
  type?: DHTResponse.Type
  peer?: PeerInfo
  value?: Uint8Array<ArrayBuffer>
}

export interface DHTResponseInput {
  type?: DHTResponse.Type
  peer?: PeerInfoInput
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<DHTResponse, DHTResponseInput>

  export const codec = (): Codec<DHTResponse, DHTResponseInput> => {
    if (_codec == null) {
      _codec = message<DHTResponse, DHTResponseInput>((obj, w, opts = {}) => {
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
      }, (r, length, opts = {}) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = DHTResponse.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.peer = PeerInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 3: {
              obj.value = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'DHTResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: DHTResponse.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield * PeerInfo.codec().stream(r, r.uint32(), `${prefix}peer.`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 3: {
              yield {
                field: `${prefix}value`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'DHTResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface DHTResponseTypeFieldEvent {
    field: '.type'
    value: DHTResponse.Type
  }

  export interface DHTResponsePeerMessageStart {
    field: '.peer'
    type: 'start'
  }

  export interface DHTResponsePeerMessageEnd {
    field: '.peer'
    type: 'end'
  }

  export interface DHTResponsePeerIdFieldEvent {
    field: '.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTResponsePeerAddrsFieldEvent {
    field: '.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface DHTResponseValueFieldEvent {
    field: '.value'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: DHTResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DHTResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DHTResponse>): DHTResponse {
    return decodeMessage(buf, DHTResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DHTResponse>): Generator<DHTResponseTypeFieldEvent | DHTResponsePeerMessageStart | DHTResponsePeerMessageEnd | DHTResponsePeerIdFieldEvent | DHTResponsePeerAddrsFieldEvent | DHTResponseValueFieldEvent> {
    return streamMessage(buf, DHTResponse.codec(), opts)
  }
}

export interface PeerInfo {
  id: Uint8Array<ArrayBuffer>
  addrs: Uint8Array<ArrayBuffer>[]
}

export interface PeerInfoInput {
  id?: Uint8Array
  addrs?: Uint8Array[]
}

export namespace PeerInfo {
  let _codec: Codec<PeerInfo, PeerInfoInput>

  export const codec = (): Codec<PeerInfo, PeerInfoInput> => {
    if (_codec == null) {
      _codec = message<PeerInfo, PeerInfoInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if ((obj.id != null && obj.id.byteLength > 0)) {
          w.uint32(10)
          w.bytes(obj.id)
        }

        if (obj.addrs != null && obj.addrs.length > 0) {
          for (const value of obj.addrs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          id: uint8ArrayAlloc(0),
          addrs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.id = r.bytes()
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs.length === opts.limits.addrs) {
                throw new MaxLengthError('Decode error - repeated field "addrs" had too many elements')
              }

              obj.addrs.push(r.bytes())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          addrs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PeerInfo'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}id`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              if (opts.limits?.addrs != null && obj.addrs === opts.limits.addrs) {
                throw new MaxLengthError('Streaming decode error - repeated field "addrs" had too many elements')
              }

              yield {
                field: `${prefix}addrs[]`,
                index: obj.addrs,
                value: r.bytes()
              }

              obj.addrs++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PeerInfo'
          }
        }
      })
    }

    return _codec
  }

  export interface PeerInfoIdFieldEvent {
    field: '.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerInfoAddrsFieldEvent {
    field: '.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PeerInfoInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PeerInfo.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): PeerInfo {
    return decodeMessage(buf, PeerInfo.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerInfo>): Generator<PeerInfoIdFieldEvent | PeerInfoAddrsFieldEvent> {
    return streamMessage(buf, PeerInfo.codec(), opts)
  }
}

export interface ConnManagerRequest {
  type?: ConnManagerRequest.Type
  peer?: Uint8Array<ArrayBuffer>
  tag?: string
  weight?: bigint
}

export interface ConnManagerRequestInput {
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<ConnManagerRequest, ConnManagerRequestInput>

  export const codec = (): Codec<ConnManagerRequest, ConnManagerRequestInput> => {
    if (_codec == null) {
      _codec = message<ConnManagerRequest, ConnManagerRequestInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = ConnManagerRequest.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.peer = r.bytes()
              break
            }
            case 3: {
              obj.tag = r.string()
              break
            }
            case 4: {
              obj.weight = r.int64()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'ConnManagerRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: ConnManagerRequest.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}tag`,
                value: r.string()
              }
              break
            }
            case 4: {
              yield {
                field: `${prefix}weight`,
                value: r.int64()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'ConnManagerRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface ConnManagerRequestTypeFieldEvent {
    field: '.type'
    value: ConnManagerRequest.Type
  }

  export interface ConnManagerRequestPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export interface ConnManagerRequestTagFieldEvent {
    field: '.tag'
    value: string
  }

  export interface ConnManagerRequestWeightFieldEvent {
    field: '.weight'
    value: bigint
  }

  export function encode (obj: ConnManagerRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, ConnManagerRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnManagerRequest>): ConnManagerRequest {
    return decodeMessage(buf, ConnManagerRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<ConnManagerRequest>): Generator<ConnManagerRequestTypeFieldEvent | ConnManagerRequestPeerFieldEvent | ConnManagerRequestTagFieldEvent | ConnManagerRequestWeightFieldEvent> {
    return streamMessage(buf, ConnManagerRequest.codec(), opts)
  }
}

export interface DisconnectRequest {
  peer: Uint8Array<ArrayBuffer>
}

export interface DisconnectRequestInput {
  peer?: Uint8Array
}

export namespace DisconnectRequest {
  let _codec: Codec<DisconnectRequest, DisconnectRequestInput>

  export const codec = (): Codec<DisconnectRequest, DisconnectRequestInput> => {
    if (_codec == null) {
      _codec = message<DisconnectRequest, DisconnectRequestInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {
          peer: uint8ArrayAlloc(0)
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peer = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'DisconnectRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}peer`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'DisconnectRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface DisconnectRequestPeerFieldEvent {
    field: '.peer'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: DisconnectRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, DisconnectRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DisconnectRequest>): DisconnectRequest {
    return decodeMessage(buf, DisconnectRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<DisconnectRequest>): Generator<DisconnectRequestPeerFieldEvent> {
    return streamMessage(buf, DisconnectRequest.codec(), opts)
  }
}

export interface PSRequest {
  type?: PSRequest.Type
  topic?: string
  data?: Uint8Array<ArrayBuffer>
}

export interface PSRequestInput {
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<PSRequest, PSRequestInput>

  export const codec = (): Codec<PSRequest, PSRequestInput> => {
    if (_codec == null) {
      _codec = message<PSRequest, PSRequestInput>((obj, w, opts = {}) => {
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
      }, (r, length) => {
        const obj: any = {}

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = PSRequest.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.topic = r.string()
              break
            }
            case 3: {
              obj.data = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix) {
        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PSRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: PSRequest.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}topic`,
                value: r.string()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}data`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PSRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface PSRequestTypeFieldEvent {
    field: '.type'
    value: PSRequest.Type
  }

  export interface PSRequestTopicFieldEvent {
    field: '.topic'
    value: string
  }

  export interface PSRequestDataFieldEvent {
    field: '.data'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PSRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PSRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSRequest>): PSRequest {
    return decodeMessage(buf, PSRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSRequest>): Generator<PSRequestTypeFieldEvent | PSRequestTopicFieldEvent | PSRequestDataFieldEvent> {
    return streamMessage(buf, PSRequest.codec(), opts)
  }
}

export interface PSMessage {
  from?: Uint8Array<ArrayBuffer>
  data?: Uint8Array<ArrayBuffer>
  seqno?: Uint8Array<ArrayBuffer>
  topicIDs: string[]
  signature?: Uint8Array<ArrayBuffer>
  key?: Uint8Array<ArrayBuffer>
}

export interface PSMessageInput {
  from?: Uint8Array
  data?: Uint8Array
  seqno?: Uint8Array
  topicIDs?: string[]
  signature?: Uint8Array
  key?: Uint8Array
}

export namespace PSMessage {
  let _codec: Codec<PSMessage, PSMessageInput>

  export const codec = (): Codec<PSMessage, PSMessageInput> => {
    if (_codec == null) {
      _codec = message<PSMessage, PSMessageInput>((obj, w, opts = {}) => {
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

        if (obj.topicIDs != null && obj.topicIDs.length > 0) {
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
      }, (r, length, opts = {}) => {
        const obj: any = {
          topicIDs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.from = r.bytes()
              break
            }
            case 2: {
              obj.data = r.bytes()
              break
            }
            case 3: {
              obj.seqno = r.bytes()
              break
            }
            case 4: {
              if (opts.limits?.topicIDs != null && obj.topicIDs.length === opts.limits.topicIDs) {
                throw new MaxLengthError('Decode error - repeated field "topicIDs" had too many elements')
              }

              obj.topicIDs.push(r.string())
              break
            }
            case 5: {
              obj.signature = r.bytes()
              break
            }
            case 6: {
              obj.key = r.bytes()
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          topicIDs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PSMessage'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}from`,
                value: r.bytes()
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}data`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              yield {
                field: `${prefix}seqno`,
                value: r.bytes()
              }
              break
            }
            case 4: {
              if (opts.limits?.topicIDs != null && obj.topicIDs === opts.limits.topicIDs) {
                throw new MaxLengthError('Streaming decode error - repeated field "topicIDs" had too many elements')
              }

              yield {
                field: `${prefix}topicIDs[]`,
                index: obj.topicIDs,
                value: r.string()
              }

              obj.topicIDs++

              break
            }
            case 5: {
              yield {
                field: `${prefix}signature`,
                value: r.bytes()
              }
              break
            }
            case 6: {
              yield {
                field: `${prefix}key`,
                value: r.bytes()
              }
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PSMessage'
          }
        }
      })
    }

    return _codec
  }

  export interface PSMessageFromFieldEvent {
    field: '.from'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PSMessageDataFieldEvent {
    field: '.data'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PSMessageSeqnoFieldEvent {
    field: '.seqno'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PSMessageTopicIDsFieldEvent {
    field: '.topicIDs[]'
    index: number
    value: string
  }

  export interface PSMessageSignatureFieldEvent {
    field: '.signature'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PSMessageKeyFieldEvent {
    field: '.key'
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PSMessageInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PSMessage.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSMessage>): PSMessage {
    return decodeMessage(buf, PSMessage.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSMessage>): Generator<PSMessageFromFieldEvent | PSMessageDataFieldEvent | PSMessageSeqnoFieldEvent | PSMessageTopicIDsFieldEvent | PSMessageSignatureFieldEvent | PSMessageKeyFieldEvent> {
    return streamMessage(buf, PSMessage.codec(), opts)
  }
}

export interface PSResponse {
  topics: string[]
  peerIDs: Uint8Array<ArrayBuffer>[]
}

export interface PSResponseInput {
  topics?: string[]
  peerIDs?: Uint8Array[]
}

export namespace PSResponse {
  let _codec: Codec<PSResponse, PSResponseInput>

  export const codec = (): Codec<PSResponse, PSResponseInput> => {
    if (_codec == null) {
      _codec = message<PSResponse, PSResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.topics != null && obj.topics.length > 0) {
          for (const value of obj.topics) {
            w.uint32(10)
            w.string(value)
          }
        }

        if (obj.peerIDs != null && obj.peerIDs.length > 0) {
          for (const value of obj.peerIDs) {
            w.uint32(18)
            w.bytes(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          topics: [],
          peerIDs: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.topics != null && obj.topics.length === opts.limits.topics) {
                throw new MaxLengthError('Decode error - repeated field "topics" had too many elements')
              }

              obj.topics.push(r.string())
              break
            }
            case 2: {
              if (opts.limits?.peerIDs != null && obj.peerIDs.length === opts.limits.peerIDs) {
                throw new MaxLengthError('Decode error - repeated field "peerIDs" had too many elements')
              }

              obj.peerIDs.push(r.bytes())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          topics: 0,
          peerIDs: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PSResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              if (opts.limits?.topics != null && obj.topics === opts.limits.topics) {
                throw new MaxLengthError('Streaming decode error - repeated field "topics" had too many elements')
              }

              yield {
                field: `${prefix}topics[]`,
                index: obj.topics,
                value: r.string()
              }

              obj.topics++

              break
            }
            case 2: {
              if (opts.limits?.peerIDs != null && obj.peerIDs === opts.limits.peerIDs) {
                throw new MaxLengthError('Streaming decode error - repeated field "peerIDs" had too many elements')
              }

              yield {
                field: `${prefix}peerIDs[]`,
                index: obj.peerIDs,
                value: r.bytes()
              }

              obj.peerIDs++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PSResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface PSResponseTopicsFieldEvent {
    field: '.topics[]'
    index: number
    value: string
  }

  export interface PSResponsePeerIDsFieldEvent {
    field: '.peerIDs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export function encode (obj: PSResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PSResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSResponse>): PSResponse {
    return decodeMessage(buf, PSResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PSResponse>): Generator<PSResponseTopicsFieldEvent | PSResponsePeerIDsFieldEvent> {
    return streamMessage(buf, PSResponse.codec(), opts)
  }
}

export interface PeerstoreRequest {
  type?: PeerstoreRequest.Type
  id?: Uint8Array<ArrayBuffer>
  protos: string[]
}

export interface PeerstoreRequestInput {
  type?: PeerstoreRequest.Type
  id?: Uint8Array
  protos?: string[]
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
    export const codec = (): Codec<Type, Type> => {
      return enumeration<Type>(__TypeValues)
    }
  }

  let _codec: Codec<PeerstoreRequest, PeerstoreRequestInput>

  export const codec = (): Codec<PeerstoreRequest, PeerstoreRequestInput> => {
    if (_codec == null) {
      _codec = message<PeerstoreRequest, PeerstoreRequestInput>((obj, w, opts = {}) => {
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

        if (obj.protos != null && obj.protos.length > 0) {
          for (const value of obj.protos) {
            w.uint32(26)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          protos: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.type = PeerstoreRequest.Type.codec().decode(r)
              break
            }
            case 2: {
              obj.id = r.bytes()
              break
            }
            case 3: {
              if (opts.limits?.protos != null && obj.protos.length === opts.limits.protos) {
                throw new MaxLengthError('Decode error - repeated field "protos" had too many elements')
              }

              obj.protos.push(r.string())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          protos: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PeerstoreRequest'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield {
                field: `${prefix}type`,
                value: PeerstoreRequest.Type.codec().decode(r)
              }
              break
            }
            case 2: {
              yield {
                field: `${prefix}id`,
                value: r.bytes()
              }
              break
            }
            case 3: {
              if (opts.limits?.protos != null && obj.protos === opts.limits.protos) {
                throw new MaxLengthError('Streaming decode error - repeated field "protos" had too many elements')
              }

              yield {
                field: `${prefix}protos[]`,
                index: obj.protos,
                value: r.string()
              }

              obj.protos++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PeerstoreRequest'
          }
        }
      })
    }

    return _codec
  }

  export interface PeerstoreRequestTypeFieldEvent {
    field: '.type'
    value: PeerstoreRequest.Type
  }

  export interface PeerstoreRequestIdFieldEvent {
    field: '.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerstoreRequestProtosFieldEvent {
    field: '.protos[]'
    index: number
    value: string
  }

  export function encode (obj: PeerstoreRequestInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PeerstoreRequest.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerstoreRequest>): PeerstoreRequest {
    return decodeMessage(buf, PeerstoreRequest.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerstoreRequest>): Generator<PeerstoreRequestTypeFieldEvent | PeerstoreRequestIdFieldEvent | PeerstoreRequestProtosFieldEvent> {
    return streamMessage(buf, PeerstoreRequest.codec(), opts)
  }
}

export interface PeerstoreResponse {
  peer?: PeerInfo
  protos: string[]
}

export interface PeerstoreResponseInput {
  peer?: PeerInfoInput
  protos?: string[]
}

export namespace PeerstoreResponse {
  let _codec: Codec<PeerstoreResponse, PeerstoreResponseInput>

  export const codec = (): Codec<PeerstoreResponse, PeerstoreResponseInput> => {
    if (_codec == null) {
      _codec = message<PeerstoreResponse, PeerstoreResponseInput>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (obj.peer != null) {
          w.uint32(10)
          PeerInfo.codec().encode(obj.peer, w)
        }

        if (obj.protos != null && obj.protos.length > 0) {
          for (const value of obj.protos) {
            w.uint32(18)
            w.string(value)
          }
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (r, length, opts = {}) => {
        const obj: any = {
          protos: []
        }

        const end = length == null ? r.len : r.pos + length

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              obj.peer = PeerInfo.codec().decode(r, r.uint32(), {
                limits: opts.limits?.peer
              })
              break
            }
            case 2: {
              if (opts.limits?.protos != null && obj.protos.length === opts.limits.protos) {
                throw new MaxLengthError('Decode error - repeated field "protos" had too many elements')
              }

              obj.protos.push(r.string())
              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        return obj
      }, function * (r, length, prefix, opts = {}) {
        const obj = {
          protos: 0
        }

        const end = length == null ? r.len : r.pos + length

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'start',
            message: 'PeerstoreResponse'
          }
        }

        while (r.pos < end) {
          const tag = r.uint32()

          switch (tag >>> 3) {
            case 1: {
              yield * PeerInfo.codec().stream(r, r.uint32(), `${prefix}peer.`, {
                limits: opts.limits?.peer
              })

              break
            }
            case 2: {
              if (opts.limits?.protos != null && obj.protos === opts.limits.protos) {
                throw new MaxLengthError('Streaming decode error - repeated field "protos" had too many elements')
              }

              yield {
                field: `${prefix}protos[]`,
                index: obj.protos,
                value: r.string()
              }

              obj.protos++

              break
            }
            default: {
              r.skipType(tag & 7)
              break
            }
          }
        }

        if (prefix !== '.') {
          yield {
            field: prefix.endsWith('.') ? prefix.substring(0, prefix.length - 1) : prefix,
            type: 'end',
            message: 'PeerstoreResponse'
          }
        }
      })
    }

    return _codec
  }

  export interface PeerstoreResponsePeerMessageStart {
    field: '.peer'
    type: 'start'
  }

  export interface PeerstoreResponsePeerMessageEnd {
    field: '.peer'
    type: 'end'
  }

  export interface PeerstoreResponsePeerIdFieldEvent {
    field: '.peer.id'
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerstoreResponsePeerAddrsFieldEvent {
    field: '.peer.addrs[]'
    index: number
    value: Uint8Array<ArrayBuffer>
  }

  export interface PeerstoreResponseProtosFieldEvent {
    field: '.protos[]'
    index: number
    value: string
  }

  export function encode (obj: PeerstoreResponseInput): Uint8Array<ArrayBuffer> {
    return encodeMessage(obj, PeerstoreResponse.codec())
  }

  export function decode (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerstoreResponse>): PeerstoreResponse {
    return decodeMessage(buf, PeerstoreResponse.codec(), opts)
  }

  export function stream (buf: Uint8Array | Uint8ArrayList, opts?: DecodeOptions<PeerstoreResponse>): Generator<PeerstoreResponsePeerMessageStart | PeerstoreResponsePeerMessageEnd | PeerstoreResponsePeerIdFieldEvent | PeerstoreResponsePeerAddrsFieldEvent | PeerstoreResponseProtosFieldEvent> {
    return streamMessage(buf, PeerstoreResponse.codec(), opts)
  }
}
