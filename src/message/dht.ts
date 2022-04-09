/* eslint-disable import/export */
/* eslint-disable @typescript-eslint/no-namespace */

import { encodeMessage, decodeMessage, message, bytes, string, enumeration, int32 } from 'protons-runtime'

export interface Record {
  key?: Uint8Array
  value?: Uint8Array
  author?: Uint8Array
  signature?: Uint8Array
  timeReceived?: string
}

export namespace Record {
  export const codec = () => {
    return message<Record>({
      1: { name: 'key', codec: bytes, optional: true },
      2: { name: 'value', codec: bytes, optional: true },
      3: { name: 'author', codec: bytes, optional: true },
      4: { name: 'signature', codec: bytes, optional: true },
      5: { name: 'timeReceived', codec: string, optional: true }
    })
  }

  export const encode = (obj: Record): Uint8Array => {
    return encodeMessage(obj, Record.codec())
  }

  export const decode = (buf: Uint8Array): Record => {
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

  export namespace MessageType {
    export const codec = () => {
      return enumeration<typeof MessageType>(MessageType)
    }
  }
  export enum ConnectionType {
    NOT_CONNECTED = 'NOT_CONNECTED',
    CONNECTED = 'CONNECTED',
    CAN_CONNECT = 'CAN_CONNECT',
    CANNOT_CONNECT = 'CANNOT_CONNECT'
  }

  export namespace ConnectionType {
    export const codec = () => {
      return enumeration<typeof ConnectionType>(ConnectionType)
    }
  }
  export interface Peer {
    id?: Uint8Array
    addrs: Uint8Array[]
    connection?: Message.ConnectionType
  }

  export namespace Peer {
    export const codec = () => {
      return message<Peer>({
        1: { name: 'id', codec: bytes, optional: true },
        2: { name: 'addrs', codec: bytes, repeats: true },
        3: { name: 'connection', codec: Message.ConnectionType.codec(), optional: true }
      })
    }

    export const encode = (obj: Peer): Uint8Array => {
      return encodeMessage(obj, Peer.codec())
    }

    export const decode = (buf: Uint8Array): Peer => {
      return decodeMessage(buf, Peer.codec())
    }
  }

  export const codec = () => {
    return message<Message>({
      1: { name: 'type', codec: Message.MessageType.codec(), optional: true },
      10: { name: 'clusterLevelRaw', codec: int32, optional: true },
      2: { name: 'key', codec: bytes, optional: true },
      3: { name: 'record', codec: bytes, optional: true },
      8: { name: 'closerPeers', codec: Message.Peer.codec(), repeats: true },
      9: { name: 'providerPeers', codec: Message.Peer.codec(), repeats: true }
    })
  }

  export const encode = (obj: Message): Uint8Array => {
    return encodeMessage(obj, Message.codec())
  }

  export const decode = (buf: Uint8Array): Message => {
    return decodeMessage(buf, Message.codec())
  }
}
